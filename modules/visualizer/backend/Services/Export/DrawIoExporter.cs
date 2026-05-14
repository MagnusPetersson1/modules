using System.Text;
using System.Xml;
using Visualizer.Models;

namespace Visualizer.Services.Export;

/// <summary>
/// Converts a WorkspaceModel to DrawIO XML (.drawio / .xml).
/// Serializes the first non-sequence view that has elements; falls back to all elements.
/// Lossy: DrawIO shape names are approximated. Position and size are preserved.
/// </summary>
public class DrawIoExporter
{
    // Default node dimensions when no size is stored in the style
    private static readonly Dictionary<string, (int W, int H)> DefaultSizes = new()
    {
        ["person"]      = (120, 80),
        ["system"]      = (160, 80),
        ["application"] = (160, 80),
        ["component"]   = (160, 80),
        ["database"]    = (120, 100),
        ["process"]     = (160, 60),
        ["service"]     = (160, 60),
        ["capability"]  = (160, 60),
        ["decision"]    = (120, 80),
        ["node"]        = (160, 80),
        ["device"]      = (160, 80),
        ["annotation"]  = (200, 60),
        ["boundary"]    = (320, 220),
    };

    // Maps AML element type → DrawIO shape style string
    private static string ShapeStyle(string type, ElementStyleConfig? s) => type switch
    {
        "person"      => $"shape=mxgraph.c4.person2;html=1;whiteSpace=wrap;fillColor={Bg(s, "#dae8fc")};strokeColor={Stroke(s, "#6c8ebf")};fontStyle=1;verticalLabelPosition=bottom;verticalAlign=top;",
        "database"    => $"shape=mxgraph.basic.storage;html=1;whiteSpace=wrap;fillColor={Bg(s, "#f5f5f5")};strokeColor={Stroke(s, "#666666")};",
        "boundary"    => $"rounded=1;html=1;whiteSpace=wrap;fillColor=none;dashed=1;strokeColor={Stroke(s, "#666666")};verticalAlign=top;",
        "annotation"  => $"text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;",
        "decision"    => $"rhombus;html=1;whiteSpace=wrap;fillColor={Bg(s, "#fff2cc")};strokeColor={Stroke(s, "#d6b656")};",
        _             => $"rounded=1;html=1;whiteSpace=wrap;fillColor={Bg(s, "#f5f5f5")};strokeColor={Stroke(s, "#666666")};",
    };

    private static string EdgeStyle(RelationshipStyleConfig? s)
    {
        var parts = new List<string> { "edgeStyle=orthogonalEdgeStyle" };
        if (s?.LineStyle == "dashed")  parts.Add("dashed=1");
        if (s?.LineStyle == "dotted")  parts.Add("dashed=1;dashPattern=1 4");
        if (s?.BendStyle == "curved")  parts.Add("curved=1");
        if (s?.ArrowEnd  == "none")    parts.Add("endArrow=none");
        if (s?.ArrowEnd  == "filled")  parts.Add("endArrow=block;endFill=1");
        if (s?.ArrowStart == "open")   parts.Add("startArrow=open");
        if (s?.Color is { } c)         parts.Add($"strokeColor={c}");
        if (s?.Thickness is { } t)     parts.Add($"strokeWidth={t}");
        return string.Join(";", parts) + ";";
    }

    private static string Bg(ElementStyleConfig? s, string fallback) =>
        s?.Background ?? fallback;

    private static string Stroke(ElementStyleConfig? s, string fallback) =>
        s?.Color ?? fallback;

    public string Export(WorkspaceModel model)
    {
        // Pick the best view to export — prefer the first non-sequence view with includes
        var view = model.Views.FirstOrDefault(v => v.Type != "sequence" && v.Include?.Count > 0)
                ?? model.Views.FirstOrDefault(v => v.Type != "sequence")
                ?? model.Views.FirstOrDefault();

        var elementIndex = model.Model.Elements.ToDictionary(e => e.Id);
        var relIndex     = model.Model.Relationships.ToDictionary(r => r.Id ?? $"{r.From}-{r.To}");

        // Which elements to include
        IEnumerable<ElementModel> visibleElements = view?.Include?.Count > 0
            ? view.Include.Select(id => elementIndex.TryGetValue(id, out var e) ? e : null).OfType<ElementModel>()
            : model.Model.Elements;

        // Which relationships connect visible elements
        var visibleIds = visibleElements.Select(e => e.Id).ToHashSet();
        var visibleRels = model.Model.Relationships
            .Where(r => visibleIds.Contains(r.From) && visibleIds.Contains(r.To));

        using var ms = new System.IO.MemoryStream();
        var settings = new XmlWriterSettings
        {
            Indent = true,
            OmitXmlDeclaration = false,
            Encoding = Encoding.UTF8,
        };

        using (var writer = XmlWriter.Create(ms, settings))
        {
            writer.WriteStartDocument();
            writer.WriteStartElement("mxfile");
            writer.WriteAttributeString("host", "Visualizer");
            writer.WriteAttributeString("version", "1.0");

            writer.WriteStartElement("diagram");
            writer.WriteAttributeString("id", view?.Id ?? "diagram");
            writer.WriteAttributeString("name", view?.Name ?? model.Workspace.Name);

            writer.WriteStartElement("mxGraphModel");
            writer.WriteAttributeString("dx", "1422");
            writer.WriteAttributeString("dy", "762");
            writer.WriteAttributeString("grid", "1");
            writer.WriteAttributeString("gridSize", "10");
            writer.WriteAttributeString("connect", "1");
            writer.WriteAttributeString("tooltips", "1");
            writer.WriteAttributeString("arrows", "1");
            writer.WriteAttributeString("fold", "1");
            writer.WriteAttributeString("page", "1");
            writer.WriteAttributeString("pageScale", "1");
            writer.WriteAttributeString("pageWidth", "1169");
            writer.WriteAttributeString("pageHeight", "827");

            writer.WriteStartElement("root");
            writer.WriteStartElement("mxCell"); writer.WriteAttributeString("id", "0"); writer.WriteEndElement();
            writer.WriteStartElement("mxCell"); writer.WriteAttributeString("id", "1"); writer.WriteAttributeString("parent", "0"); writer.WriteEndElement();

            int fallbackIdx = 0;
            foreach (var e in visibleElements)
            {
                var s = view?.Styles?.Elements?.GetValueOrDefault(e.Id);
                var pos = view?.Positions?.GetValueOrDefault(e.Id);
                var defaults = DefaultSizes.TryGetValue(e.Type, out var d) ? d : (W: 160, H: 80);
                var x = pos?.X ?? (60 + (fallbackIdx % 4) * 220.0);
                var y = pos?.Y ?? (60 + (fallbackIdx / 4) * 200.0);
                var w = s?.Width  ?? defaults.W;
                var h = s?.Height ?? defaults.H;

                writer.WriteStartElement("mxCell");
                writer.WriteAttributeString("id",     e.Id);
                writer.WriteAttributeString("value",  FormatLabel(e));
                writer.WriteAttributeString("style",  ShapeStyle(e.Type, s));
                writer.WriteAttributeString("vertex", "1");
                writer.WriteAttributeString("parent", e.Parent ?? "1");

                writer.WriteStartElement("mxGeometry");
                writer.WriteAttributeString("x",      x.ToString("F0"));
                writer.WriteAttributeString("y",      y.ToString("F0"));
                writer.WriteAttributeString("width",  w.ToString());
                writer.WriteAttributeString("height", h.ToString());
                writer.WriteAttributeString("as", "geometry");
                writer.WriteEndElement(); // mxGeometry

                writer.WriteEndElement(); // mxCell
                fallbackIdx++;
            }

            foreach (var r in visibleRels)
            {
                var relId = r.Id ?? $"{r.From}-{r.To}";
                var s = view?.Styles?.Relationships?.GetValueOrDefault(relId);

                writer.WriteStartElement("mxCell");
                writer.WriteAttributeString("id",     relId);
                writer.WriteAttributeString("value",  r.Label ?? "");
                writer.WriteAttributeString("style",  EdgeStyle(s));
                writer.WriteAttributeString("edge",   "1");
                writer.WriteAttributeString("source", r.From);
                writer.WriteAttributeString("target", r.To);
                writer.WriteAttributeString("parent", "1");

                writer.WriteStartElement("mxGeometry");
                writer.WriteAttributeString("relative", "1");
                writer.WriteAttributeString("as", "geometry");
                writer.WriteEndElement(); // mxGeometry

                writer.WriteEndElement(); // mxCell
            }

            writer.WriteEndElement(); // root
            writer.WriteEndElement(); // mxGraphModel
            writer.WriteEndElement(); // diagram
            writer.WriteEndElement(); // mxfile
            writer.WriteEndDocument();
        }

        return Encoding.UTF8.GetString(ms.ToArray());
    }

    private static string FormatLabel(ElementModel e)
    {
        var parts = new List<string> { $"<b>{EscapeXml(e.Name)}</b>" };
        if (e.Tech is not null)
            parts.Add($"<i>[{EscapeXml(e.Tech)}]</i>");
        if (e.Description is not null)
            parts.Add(EscapeXml(e.Description));
        return string.Join("<br/>", parts);
    }

    private static string EscapeXml(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}
