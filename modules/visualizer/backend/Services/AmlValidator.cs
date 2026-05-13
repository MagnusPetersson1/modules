using Visualizer.Models;

namespace Visualizer.Services;

/// <summary>
/// Cross-reference validation pass run after parsing.
/// Checks referential integrity (include/positions reference real element ids, etc.)
/// </summary>
public class AmlValidator
{
    public List<ParseError> Validate(WorkspaceModel model)
    {
        var errors = new List<ParseError>();
        var elementIds = model.Model.Elements.Select(e => e.Id).ToHashSet();
        var relIds = model.Model.Relationships.Select(r => r.Id).Where(id => id is not null).ToHashSet();

        foreach (var view in model.Views)
        {
            // include references
            foreach (var id in view.Include ?? [])
                if (!elementIds.Contains(id))
                    errors.Add(new ParseError($"View '{view.Id}': include references unknown element '{id}'", "warning"));

            // position references
            foreach (var id in (view.Positions ?? []).Keys)
                if (!elementIds.Contains(id))
                    errors.Add(new ParseError($"View '{view.Id}': position entry references unknown element '{id}'", "warning"));

            // style element references
            foreach (var id in (view.Styles?.Elements ?? []).Keys)
                if (!elementIds.Contains(id))
                    errors.Add(new ParseError($"View '{view.Id}': styles.elements references unknown element '{id}'", "warning"));

            // style relationship references
            foreach (var id in (view.Styles?.Relationships ?? []).Keys)
                if (!relIds.Contains(id))
                    errors.Add(new ParseError($"View '{view.Id}': styles.relationships references unknown relationship '{id}'", "warning"));

            // layer band include references
            foreach (var band in view.Layers ?? [])
                foreach (var id in band.Include ?? [])
                    if (!elementIds.Contains(id))
                        errors.Add(new ParseError($"View '{view.Id}' layer '{band.Id}': include references unknown element '{id}'", "warning"));

            // display layer element references
            foreach (var dl in view.DisplayLayers ?? [])
                foreach (var id in dl.Elements ?? [])
                    if (!elementIds.Contains(id))
                        errors.Add(new ParseError($"View '{view.Id}' displayLayer '{dl.Id}': references unknown element '{id}'", "warning"));

            // parent references
            foreach (var el in model.Model.Elements.Where(e => e.Parent is not null))
                if (!elementIds.Contains(el.Parent!))
                    errors.Add(new ParseError($"Element '{el.Id}': parent '{el.Parent}' does not exist", "warning"));

            // relationship from/to references
            foreach (var rel in model.Model.Relationships)
            {
                if (!elementIds.Contains(rel.From))
                    errors.Add(new ParseError($"Relationship '{rel.Id}': from '{rel.From}' does not exist", "warning"));
                if (!elementIds.Contains(rel.To))
                    errors.Add(new ParseError($"Relationship '{rel.Id}': to '{rel.To}' does not exist", "warning"));
            }
        }

        return errors;
    }
}
