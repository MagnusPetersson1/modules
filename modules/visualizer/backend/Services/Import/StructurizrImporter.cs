using System.Text.RegularExpressions;
using Visualizer.Models;

namespace Visualizer.Services.Import;

/// <summary>
/// Converts Structurizr DSL to a WorkspaceModel.
///
/// Supports:
///   workspace { model { ... } views { ... } }
///   person, softwareSystem, container, component declarations
///   -> relationship syntax
///   systemContext, container, component view blocks
///   include/exclude directives in views
///
/// Lossy: tags, theme, filtered views, and dynamic views are not fully mapped.
/// </summary>
public class StructurizrImporter
{
    // ── Element declarations ──────────────────────────────────────────────────
    // person "Name" "Desc" { tags "..." }
    private static readonly Regex PersonDecl = new(
        @"^\s*(\w+)\s*=\s*person\s+""([^""]*)""\s*(?:""([^""]*)"")?",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    // var = softwareSystem "Name" "Desc"
    private static readonly Regex SystemDecl = new(
        @"^\s*(\w+)\s*=\s*softwareSystem\s+""([^""]*)""\s*(?:""([^""]*)"")?",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    // var = container "Name" "Desc" "Tech"  (inside a softwareSystem block)
    private static readonly Regex ContainerDecl = new(
        @"^\s*(\w+)\s*=\s*container\s+""([^""]*)""\s*(?:""([^""]*)"")?(?:\s*""([^""]*)"")?",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    // var = component "Name" "Desc" "Tech"  (inside a container block)
    private static readonly Regex ComponentDecl = new(
        @"^\s*(\w+)\s*=\s*component\s+""([^""]*)""\s*(?:""([^""]*)"")?(?:\s*""([^""]*)"")?",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    // ── Relationships ─────────────────────────────────────────────────────────
    // from -> to "label" "tech" "type"
    private static readonly Regex RelDecl = new(
        @"^\s*(\w+)\s*->\s*(\w+)\s*(?:""([^""]*)"")?(?:\s*""([^""]*)"")?",
        RegexOptions.Multiline);

    // ── Views ─────────────────────────────────────────────────────────────────
    // systemContext varName "Title" { ... }
    private static readonly Regex ViewDecl = new(
        @"^\s*(systemContext|container|component|dynamic|deployment|filtered)\s+(\w+)?\s*(?:""([^""]*)"")?[^\{]*\{([^}]*)\}",
        RegexOptions.Multiline | RegexOptions.Singleline);

    // include * or include element1 element2
    private static readonly Regex IncludeDecl = new(
        @"^\s*include\s+(.*)",
        RegexOptions.Multiline);

    // tags "tag1" "tag2"
    private static readonly Regex TagsDecl = new(
        @"^\s*tags\s+""([^""]*)""",
        RegexOptions.Multiline);

    // ── Workspace name ────────────────────────────────────────────────────────
    private static readonly Regex WorkspaceModel_ = new(
        @"^\s*model\b",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    private static readonly Regex WorkspaceName = new(
        @"workspace\s+""([^""]*)""",
        RegexOptions.IgnoreCase);

    // ─────────────────────────────────────────────────────────────────────────

    public ImportResult Import(string dsl)
    {
        var warnings   = new List<string>();
        var elements   = new List<ElementModel>();
        var rels       = new List<RelationshipModel>();
        var aliasToId  = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var seenIds    = new HashSet<string>();
        int relCounter = 0;

        // Workspace name
        var nameMatch = WorkspaceName.Match(dsl);
        var wsName    = nameMatch.Success ? nameMatch.Groups[1].Value.Trim() : "Imported Workspace";

        // ── Persons ──────────────────────────────────────────────────────────
        foreach (Match m in PersonDecl.Matches(dsl))
        {
            var alias = m.Groups[1].Value;
            var name  = m.Groups[2].Value.Trim();
            var desc  = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var id    = UniqueId(Sanitize(alias), seenIds);
            aliasToId[alias] = id;
            elements.Add(new ElementModel(id, name, "person", Description: desc));
        }

        // ── Software Systems ──────────────────────────────────────────────────
        foreach (Match m in SystemDecl.Matches(dsl))
        {
            var alias = m.Groups[1].Value;
            var name  = m.Groups[2].Value.Trim();
            var desc  = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var id    = UniqueId(Sanitize(alias), seenIds);
            aliasToId[alias] = id;
            elements.Add(new ElementModel(id, name, "system", Description: desc));
        }

        // ── Containers ────────────────────────────────────────────────────────
        foreach (Match m in ContainerDecl.Matches(dsl))
        {
            var alias = m.Groups[1].Value;
            var name  = m.Groups[2].Value.Trim();
            var desc  = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var tech  = m.Groups[4].Success ? m.Groups[4].Value.Trim() : null;
            var id    = UniqueId(Sanitize(alias), seenIds);
            aliasToId[alias] = id;
            elements.Add(new ElementModel(id, name, "application", Description: desc, Tech: tech));
        }

        // ── Components ────────────────────────────────────────────────────────
        foreach (Match m in ComponentDecl.Matches(dsl))
        {
            var alias = m.Groups[1].Value;
            var name  = m.Groups[2].Value.Trim();
            var desc  = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var tech  = m.Groups[4].Success ? m.Groups[4].Value.Trim() : null;
            var id    = UniqueId(Sanitize(alias), seenIds);
            aliasToId[alias] = id;
            elements.Add(new ElementModel(id, name, "component", Description: desc, Tech: tech));
        }

        // ── Relationships ─────────────────────────────────────────────────────
        foreach (Match m in RelDecl.Matches(dsl))
        {
            var fromAlias = m.Groups[1].Value;
            var toAlias   = m.Groups[2].Value;
            var label     = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;

            if (!aliasToId.TryGetValue(fromAlias, out var from) ||
                !aliasToId.TryGetValue(toAlias, out var to))
            {
                warnings.Add($"Skipped relationship: alias '{fromAlias}' or '{toAlias}' not found");
                continue;
            }

            rels.Add(new RelationshipModel(from, to, Id: $"rel-{++relCounter}", Label: label, Type: "uses"));
        }

        // ── Views ─────────────────────────────────────────────────────────────
        var views = new List<ViewModel>();
        int viewCounter = 0;

        foreach (Match m in ViewDecl.Matches(dsl))
        {
            var viewKind  = m.Groups[1].Value.ToLower();
            var scopeAlias = m.Groups[2].Success ? m.Groups[2].Value.Trim() : "";
            var title     = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var body      = m.Groups[4].Value;

            var amlType = viewKind switch
            {
                "systemcontext" => "c4-context",
                "container"     => "c4-container",
                "component"     => "c4-component",
                _               => "c4-context",
            };

            if (viewKind is "dynamic" or "deployment" or "filtered")
            {
                warnings.Add($"View type '{viewKind}' is not fully supported — skipped");
                continue;
            }

            // Build include list from include directives in the view body
            List<string>? include = null;
            var includeMatch = IncludeDecl.Match(body);
            if (includeMatch.Success)
            {
                var raw = includeMatch.Groups[1].Value.Trim();
                if (raw == "*")
                {
                    include = elements.Select(e => e.Id).ToList();
                }
                else
                {
                    include = raw.Split([' ', '\t', ','], StringSplitOptions.RemoveEmptyEntries)
                        .Select(a => aliasToId.TryGetValue(a, out var id) ? id : null)
                        .OfType<string>()
                        .ToList();
                }
            }
            else
            {
                // No explicit include — include all elements
                include = elements.Select(e => e.Id).ToList();
            }

            var viewId = $"view-{++viewCounter}";
            views.Add(new ViewModel(viewId, title ?? $"View {viewCounter}", amlType,
                Include: include,
                Layout: new LayoutConfig("layered", "top-down")));
        }

        // If no views declared, create a default one with all elements
        if (views.Count == 0)
        {
            warnings.Add("No views found in DSL — created a default context view with all elements");
            views.Add(new ViewModel("view-1", "System Context", "c4-context",
                Include: elements.Select(e => e.Id).ToList(),
                Layout: new LayoutConfig("layered", "top-down")));
        }

        if (elements.Count == 0)
            warnings.Add("No elements found — check that person/softwareSystem/container assignments use the format: alias = person \"Name\"");

        return new ImportResult(
            new WorkspaceModel(new WorkspaceMeta(wsName), new ModelSection(elements, rels), views),
            warnings);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string Sanitize(string s) =>
        Regex.Replace(s.Trim(), @"[^a-zA-Z0-9-]", "-").ToLower().TrimStart('-');

    private static string UniqueId(string base_, HashSet<string> seen)
    {
        if (seen.Add(base_)) return base_;
        int i = 2;
        while (!seen.Add($"{base_}-{i}")) i++;
        return $"{base_}-{i}";
    }
}
