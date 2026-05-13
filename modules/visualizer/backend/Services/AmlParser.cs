using Visualizer.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using YamlDotNet.Core;

namespace Visualizer.Services;

/// <summary>
/// Parses AML YAML strings into WorkspaceModel.
/// Uses a strict YAML 1.1 subset: all IDs must be alphanumeric+hyphen (quoted),
/// preventing coercion bugs (e.g. id: NO → false).
/// </summary>
public class AmlParser
{
    private readonly IDeserializer _deserializer = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .IgnoreUnmatchedProperties()
        .Build();

    public ParseResult Parse(string yaml)
    {
        var errors = new List<ParseError>();

        if (string.IsNullOrWhiteSpace(yaml))
        {
            errors.Add(new ParseError("Document is empty", "error"));
            return new ParseResult(null, errors);
        }

        try
        {
            var raw = _deserializer.Deserialize<RawWorkspace>(yaml);
            if (raw is null)
            {
                errors.Add(new ParseError("Document could not be parsed", "error"));
                return new ParseResult(null, errors);
            }

            var model = Map(raw, errors);
            return new ParseResult(model, errors);
        }
        catch (YamlException ex)
        {
            errors.Add(new ParseError(
                ex.Message,
                "error",
                (int?)ex.Start.Line,
                (int?)ex.Start.Column));
            return new ParseResult(null, errors);
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static WorkspaceModel Map(RawWorkspace raw, List<ParseError> errors)
    {
        var meta = new WorkspaceMeta(
            raw.Workspace?.Name ?? "Untitled",
            raw.Workspace?.Version,
            raw.Workspace?.Context is { } rc
                ? new WorkspaceContext(rc.Domain, rc.Perspective, rc.Scope, rc.Audience, rc.Notes)
                : null);

        var elements = (raw.Model?.Elements ?? [])
            .Where(e => ValidateElement(e, errors))
            .Select(MapElement)
            .ToList();

        var relationships = (raw.Model?.Relationships ?? [])
            .Where(r => ValidateRelationship(r, errors))
            .Select(MapRelationship)
            .ToList();

        var views = (raw.Views ?? [])
            .Select(v => MapView(v, errors))
            .ToList();

        return new WorkspaceModel(
            meta,
            new ModelSection(elements, relationships),
            views);
    }

    private static ElementModel MapElement(RawElement r) => new(
        Id: r.Id!,
        Name: r.Name ?? r.Id!,
        Type: r.Type ?? "system",
        Description: r.Description,
        Tags: r.Tags,
        Layer: r.Layer,
        Tech: r.Tech,
        Parent: r.Parent,
        Text: r.Text);

    private static RelationshipModel MapRelationship(RawRelationship r) => new(
        From: r.From!,
        To: r.To!,
        Id: r.Id ?? $"{r.From}-{r.To}",
        Label: r.Label,
        Type: r.Type ?? "association");

    private static ViewModel MapView(RawView r, List<ParseError> errors) => new(
        Id: r.Id ?? "view",
        Name: r.Name,
        Type: r.Type ?? "c4-context",
        Include: r.Include,
        Layers: r.Layers?.Select(l => new LayerBand(l.Id ?? "layer", l.Name, l.Color, l.Include)).ToList(),
        DisplayLayers: r.DisplayLayers?.Select(d => new DisplayLayer(d.Id ?? "layer", d.ZIndex, d.Visible ?? true, d.Elements)).ToList(),
        Layout: r.Layout is null ? null : new LayoutConfig(r.Layout.Algorithm ?? "layered", r.Layout.Direction ?? "top-down"),
        Positions: r.Positions?.ToDictionary(
            kv => kv.Key,
            kv => new PositionModel(kv.Value.X, kv.Value.Y)),
        Styles: MapStyles(r.Styles),
        Theme: r.Theme,
        Participants: r.Participants,
        Steps: r.Steps?.Select(MapStep).ToList());

    private static SequenceStep MapStep(RawStep s) => new(
        From: s.From,
        To: s.To,
        Label: s.Label,
        Type: s.Type,
        Fragment: s.Fragment,
        Condition: s.Condition,
        Steps: s.Steps?.Select(MapStep).ToList());

    private static ViewStyles? MapStyles(RawStyles? r)
    {
        if (r is null) return null;
        var elements = r.Elements?.ToDictionary(
            kv => kv.Key,
            kv => new ElementStyleConfig(
                kv.Value.Color, kv.Value.Icon, kv.Value.Shape,
                kv.Value.FontSize, kv.Value.Width, kv.Value.Height,
                kv.Value.Background, kv.Value.ContentAlign, kv.Value.LabelPlacement));
        var rels = r.Relationships?.ToDictionary(
            kv => kv.Key,
            kv => new RelationshipStyleConfig(
                kv.Value.LineStyle, kv.Value.ArrowEnd, kv.Value.ArrowStart,
                kv.Value.Color, kv.Value.Thickness, kv.Value.BendStyle, kv.Value.LabelPosition,
                kv.Value.SourceHandle, kv.Value.TargetHandle));
        return new ViewStyles(elements, rels);
    }

    // ── Validation ────────────────────────────────────────────────────────────

    private static readonly HashSet<string> ValidElementTypes =
    [
        "person", "system", "application", "component", "database",
        "service", "process", "capability", "decision", "node", "device",
        "annotation", "sticky-note", "callout", "boundary", "divider"
    ];

    private static readonly HashSet<string> ValidRelTypes =
    [
        "uses", "realizes", "triggers", "flows-to", "assigned-to",
        "composed-of", "serves", "accesses", "association"
    ];

    private static bool ValidateElement(RawElement e, List<ParseError> errors)
    {
        if (string.IsNullOrWhiteSpace(e.Id))
        {
            errors.Add(new ParseError("Element is missing required 'id' field", "error"));
            return false;
        }
        if (e.Type is not null && !ValidElementTypes.Contains(e.Type))
            errors.Add(new ParseError($"Element '{e.Id}': unknown type '{e.Type}'", "warning"));
        return true;
    }

    private static bool ValidateRelationship(RawRelationship r, List<ParseError> errors)
    {
        if (string.IsNullOrWhiteSpace(r.From) || string.IsNullOrWhiteSpace(r.To))
        {
            errors.Add(new ParseError("Relationship is missing required 'from' or 'to' field", "error"));
            return false;
        }
        if (r.Type is not null && !ValidRelTypes.Contains(r.Type))
            errors.Add(new ParseError($"Relationship '{r.From}→{r.To}': unknown type '{r.Type}'", "warning"));
        return true;
    }

    // ── Raw POCO classes (YamlDotNet target) ──────────────────────────────────
    // Separate from domain models so YamlDotNet can use mutable properties.

    private class RawWorkspace
    {
        public RawMeta? Workspace { get; set; }
        public RawModel? Model { get; set; }
        public List<RawView>? Views { get; set; }
    }

    private class RawMeta
    {
        public string? Name { get; set; }
        public string? Version { get; set; }
        public RawContext? Context { get; set; }
    }

    private class RawContext
    {
        public string? Domain { get; set; }
        public string? Perspective { get; set; }
        public string? Scope { get; set; }
        public string? Audience { get; set; }
        public string? Notes { get; set; }
    }

    private class RawModel
    {
        public List<RawElement>? Elements { get; set; }
        public List<RawRelationship>? Relationships { get; set; }
    }

    private class RawElement
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Type { get; set; }
        public string? Description { get; set; }
        public List<string>? Tags { get; set; }
        public string? Layer { get; set; }
        public string? Tech { get; set; }
        public string? Parent { get; set; }
        public string? Text { get; set; }
    }

    private class RawRelationship
    {
        public string? Id { get; set; }
        public string? From { get; set; }
        public string? To { get; set; }
        public string? Label { get; set; }
        public string? Type { get; set; }
    }

    private class RawView
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Type { get; set; }
        public List<string>? Include { get; set; }
        public List<RawLayerBand>? Layers { get; set; }
        public List<RawDisplayLayer>? DisplayLayers { get; set; }
        public RawLayout? Layout { get; set; }
        public Dictionary<string, RawPosition>? Positions { get; set; }
        public RawStyles? Styles { get; set; }
        public string? Theme { get; set; }
        public List<string>? Participants { get; set; }
        public List<RawStep>? Steps { get; set; }
    }

    private class RawLayerBand
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Color { get; set; }
        public List<string>? Include { get; set; }
    }

    private class RawDisplayLayer
    {
        public string? Id { get; set; }
        public int ZIndex { get; set; }
        public bool? Visible { get; set; }
        public List<string>? Elements { get; set; }
    }

    private class RawLayout
    {
        public string? Algorithm { get; set; }
        public string? Direction { get; set; }
    }

    private class RawPosition
    {
        public double X { get; set; }
        public double Y { get; set; }
    }

    private class RawStyles
    {
        public Dictionary<string, RawElementStyle>? Elements { get; set; }
        public Dictionary<string, RawRelStyle>? Relationships { get; set; }
    }

    private class RawElementStyle
    {
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public string? Shape { get; set; }
        public int? FontSize { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public string? Background { get; set; }
        public string? ContentAlign { get; set; }
        public string? LabelPlacement { get; set; }
    }

    private class RawRelStyle
    {
        public string? LineStyle { get; set; }
        public string? ArrowEnd { get; set; }
        public string? ArrowStart { get; set; }
        public string? Color { get; set; }
        public int? Thickness { get; set; }
        public string? BendStyle { get; set; }
        public string? LabelPosition { get; set; }
        public string? SourceHandle { get; set; }
        public string? TargetHandle { get; set; }
    }

    private class RawStep
    {
        public string? From { get; set; }
        public string? To { get; set; }
        public string? Label { get; set; }
        public string? Type { get; set; }
        public string? Fragment { get; set; }
        public string? Condition { get; set; }
        public List<RawStep>? Steps { get; set; }
    }
}
