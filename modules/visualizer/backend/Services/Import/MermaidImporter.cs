using System.Text.RegularExpressions;
using Visualizer.Models;

namespace Visualizer.Services.Import;

/// <summary>
/// Converts Mermaid C4 and flowchart/graph DSL to a WorkspaceModel.
/// Supports:
///   - C4Context, C4Container, C4Component diagrams
///   - graph LR / graph TD / flowchart LR / flowchart TD
/// Lossy: Mermaid has no position or style info — positions are omitted.
/// </summary>
public class MermaidImporter
{
    // ── C4 patterns ───────────────────────────────────────────────────────────
    private static readonly Regex C4Header = new(
        @"^\s*(C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    // Person(alias, "Name", "Desc")   or   Person_Ext(...)
    private static readonly Regex C4Person = new(
        @"^\s*Person(?:_Ext)?\s*\(\s*(\w[\w-]*)\s*,\s*""([^""]*)""\s*(?:,\s*""([^""]*)"")?\s*\)",
        RegexOptions.Multiline);

    // System(alias, "Name", "Desc")   System_Ext, SystemDb, SystemDb_Ext
    private static readonly Regex C4System = new(
        @"^\s*System(?:_Ext|Db|Db_Ext|Queue|Queue_Ext)?\s*\(\s*(\w[\w-]*)\s*,\s*""([^""]*)""\s*(?:,\s*""([^""]*)"")?\s*\)",
        RegexOptions.Multiline);

    // Container(alias, "Name", "Tech", "Desc")
    private static readonly Regex C4Container = new(
        @"^\s*Container(?:_Ext|Db|Db_Ext|Queue|Queue_Ext)?\s*\(\s*(\w[\w-]*)\s*,\s*""([^""]*)""\s*(?:,\s*""([^""]*)"")?\s*(?:,\s*""([^""]*)"")?\s*\)",
        RegexOptions.Multiline);

    // Component(alias, "Name", "Tech", "Desc")
    private static readonly Regex C4Component = new(
        @"^\s*Component(?:_Ext|Db|Db_Ext|Queue|Queue_Ext)?\s*\(\s*(\w[\w-]*)\s*,\s*""([^""]*)""\s*(?:,\s*""([^""]*)"")?\s*(?:,\s*""([^""]*)"")?\s*\)",
        RegexOptions.Multiline);

    // Rel(from, to, "Label")   BiRel, Rel_Back, Rel_D, Rel_U, etc.
    private static readonly Regex C4Rel = new(
        @"^\s*(?:Bi)?Rel(?:_[UDLRBN]+)?\s*\(\s*(\w[\w-]*)\s*,\s*(\w[\w-]*)\s*,\s*""([^""]*)""\s*(?:,\s*""[^""]*"")?\s*\)",
        RegexOptions.Multiline);

    // Boundary(alias, "Name") { ... }
    private static readonly Regex C4Boundary = new(
        @"^\s*(?:Enterprise|System|Container)?_Boundary\s*\(\s*(\w[\w-]*)\s*,\s*""([^""]*)""\s*\)",
        RegexOptions.Multiline);

    // ── Flowchart/graph patterns ──────────────────────────────────────────────
    private static readonly Regex FlowHeader = new(
        @"^\s*(?:graph|flowchart)\s+(TD|LR|TB|RL|BT)\b",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    // nodeId["Label"]  nodeId("Label")  nodeId[("Label")]  nodeId{{"Label"}}  nodeId>"Label"]  nodeId(("Label"))
    private static readonly Regex FlowNode = new(
        @"^\s*([\w-]+)\s*[\[\(\{><]+[(\[{]?\s*""?([^""\]\)\}>]+)""?\s*[\]\)\}>]+[)\]]?",
        RegexOptions.Multiline);

    // A -->|"label"| B    A --> B    A -- label --> B    A -.-> B
    private static readonly Regex FlowEdge = new(
        @"([\w-]+)\s*(?:-->|===|==>|-.->|--[ox]?|==)\s*(?:\|""?([^|""]*?)""?\|\s*)?([\w-]+)",
        RegexOptions.Multiline);

    // ─────────────────────────────────────────────────────────────────────────

    public ImportResult Import(string dsl)
    {
        var warnings = new List<string>();
        WorkspaceModel model;

        if (C4Header.IsMatch(dsl))
            model = ImportC4(dsl, warnings);
        else if (FlowHeader.IsMatch(dsl))
            model = ImportFlowchart(dsl, warnings);
        else
        {
            warnings.Add("Could not detect diagram type. Expected C4Context/C4Container/C4Component or graph/flowchart header.");
            model = EmptyModel("Imported Diagram");
        }

        return new ImportResult(model, warnings);
    }

    // ── C4 import ─────────────────────────────────────────────────────────────

    private static WorkspaceModel ImportC4(string dsl, List<string> warnings)
    {
        var elements   = new List<ElementModel>();
        var rels       = new List<RelationshipModel>();
        var seenIds    = new HashSet<string>();
        int relCounter = 0;

        // Determine view type from header
        var headerMatch = C4Header.Match(dsl);
        var viewType    = headerMatch.Groups[1].Value.ToLower() switch
        {
            "c4context"   => "c4-context",
            "c4container" => "c4-container",
            "c4component" => "c4-component",
            _             => "c4-context",
        };

        // Boundaries
        foreach (Match m in C4Boundary.Matches(dsl))
        {
            var id   = Sanitize(m.Groups[1].Value);
            var name = m.Groups[2].Value.Trim();
            if (seenIds.Add(id))
                elements.Add(new ElementModel(id, name, "boundary"));
        }

        // Persons
        foreach (Match m in C4Person.Matches(dsl))
        {
            var id   = Sanitize(m.Groups[1].Value);
            var name = m.Groups[2].Value.Trim();
            var desc = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var isExt = m.Value.Contains("_Ext");
            var tags  = isExt ? new List<string> { "external" } : null;
            if (seenIds.Add(id))
                elements.Add(new ElementModel(id, name, "person", Description: desc, Tags: tags));
        }

        // Systems
        foreach (Match m in C4System.Matches(dsl))
        {
            var id   = Sanitize(m.Groups[1].Value);
            var name = m.Groups[2].Value.Trim();
            var desc = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var isExt = m.Value.Contains("_Ext");
            var tags  = isExt ? new List<string> { "external" } : null;
            var type  = m.Value.Contains("Db") ? "database" : "system";
            if (seenIds.Add(id))
                elements.Add(new ElementModel(id, name, type, Description: desc, Tags: tags));
        }

        // Containers
        foreach (Match m in C4Container.Matches(dsl))
        {
            var id   = Sanitize(m.Groups[1].Value);
            var name = m.Groups[2].Value.Trim();
            var tech = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var desc = m.Groups[4].Success ? m.Groups[4].Value.Trim() : null;
            var type = m.Value.Contains("Db") ? "database" : "application";
            if (seenIds.Add(id))
                elements.Add(new ElementModel(id, name, type, Description: desc, Tech: tech));
        }

        // Components
        foreach (Match m in C4Component.Matches(dsl))
        {
            var id   = Sanitize(m.Groups[1].Value);
            var name = m.Groups[2].Value.Trim();
            var tech = m.Groups[3].Success ? m.Groups[3].Value.Trim() : null;
            var desc = m.Groups[4].Success ? m.Groups[4].Value.Trim() : null;
            var type = m.Value.Contains("Db") ? "database" : "component";
            if (seenIds.Add(id))
                elements.Add(new ElementModel(id, name, type, Description: desc, Tech: tech));
        }

        // Relationships
        foreach (Match m in C4Rel.Matches(dsl))
        {
            var from  = Sanitize(m.Groups[1].Value);
            var to    = Sanitize(m.Groups[2].Value);
            var label = m.Groups[3].Value.Trim();
            rels.Add(new RelationshipModel(from, to, Id: $"rel-{++relCounter}", Label: label, Type: "uses"));
        }

        if (elements.Count == 0)
            warnings.Add("No elements found — check that Mermaid C4 element macros are used (Person, System, Container, etc.)");

        var include = elements.Select(e => e.Id).ToList();
        var view    = new ViewModel("view-1", "Imported View", viewType, Include: include,
                        Layout: new LayoutConfig("layered", "top-down"));

        return new WorkspaceModel(
            new WorkspaceMeta("Imported Diagram"),
            new ModelSection(elements, rels),
            [view]);
    }

    // ── Flowchart import ──────────────────────────────────────────────────────

    private static WorkspaceModel ImportFlowchart(string dsl, List<string> warnings)
    {
        warnings.Add("Mermaid flowchart imported as process view — element types are approximated");

        var elements   = new List<ElementModel>();
        var rels       = new List<RelationshipModel>();
        var seenIds    = new HashSet<string>();
        int relCounter = 0;

        // Extract nodes
        foreach (Match m in FlowNode.Matches(dsl))
        {
            var id   = Sanitize(m.Groups[1].Value);
            var name = m.Groups[2].Value.Trim();
            if (seenIds.Add(id))
                elements.Add(new ElementModel(id, name, "process"));
        }

        // Extract edges (and implicitly define any node seen only in edges)
        foreach (Match m in FlowEdge.Matches(dsl))
        {
            var from  = Sanitize(m.Groups[1].Value);
            var to    = Sanitize(m.Groups[3].Value);
            var label = m.Groups[2].Success ? m.Groups[2].Value.Trim() : null;

            if (seenIds.Add(from))
                elements.Add(new ElementModel(from, from, "process"));
            if (seenIds.Add(to))
                elements.Add(new ElementModel(to, to, "process"));

            rels.Add(new RelationshipModel(from, to, Id: $"rel-{++relCounter}", Label: label, Type: "flows-to"));
        }

        var include = elements.Select(e => e.Id).ToList();
        var direction = dsl.Contains("LR", StringComparison.OrdinalIgnoreCase) ? "left-right" : "top-down";
        var view = new ViewModel("view-1", "Imported View", "process", Include: include,
                     Layout: new LayoutConfig("layered", direction));

        return new WorkspaceModel(
            new WorkspaceMeta("Imported Diagram"),
            new ModelSection(elements, rels),
            [view]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string Sanitize(string id) =>
        Regex.Replace(id.Trim(), @"[^a-zA-Z0-9-]", "-").ToLower();

    private static WorkspaceModel EmptyModel(string name) =>
        new(new WorkspaceMeta(name), new ModelSection([], []), []);
}
