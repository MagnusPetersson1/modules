using System.Text;
using Visualizer.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Visualizer.Services;

/// <summary>
/// Formats a WorkspaceModel back to normalized AML YAML.
/// All string values are quoted to prevent YAML coercion bugs.
/// </summary>
public class AmlFormatter
{
    private readonly ISerializer _serializer = new SerializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitNull | DefaultValuesHandling.OmitDefaults)
        .DisableAliases()
        .Build();

    public string Format(WorkspaceModel model)
    {
        var raw = ToRaw(model);
        var yaml = _serializer.Serialize(raw);
        return yaml;
    }

    private static object ToRaw(WorkspaceModel m)
    {
        var ws = new Dictionary<string, object?> { ["name"] = m.Workspace.Name };
        if (m.Workspace.Version is not null) ws["version"] = m.Workspace.Version;
        if (m.Workspace.Context is { } ctx)
        {
            var c = new Dictionary<string, object?>();
            if (ctx.Domain      is not null) c["domain"]      = ctx.Domain;
            if (ctx.Perspective is not null) c["perspective"] = ctx.Perspective;
            if (ctx.Scope       is not null) c["scope"]       = ctx.Scope;
            if (ctx.Audience    is not null) c["audience"]    = ctx.Audience;
            if (ctx.Notes       is not null) c["notes"]       = ctx.Notes;
            if (c.Count > 0) ws["context"] = c;
        }
        return new
        {
            workspace = ws,
            model = new
            {
                elements = m.Model.Elements.Select(ElementToRaw).ToList(),
                relationships = m.Model.Relationships.Select(RelToRaw).ToList()
            },
            views = m.Views.Select(ViewToRaw).ToList()
        };
    }

    private static object ElementToRaw(ElementModel e)
    {
        var d = new Dictionary<string, object?> { ["id"] = e.Id, ["name"] = e.Name, ["type"] = e.Type };
        if (e.Description is not null) d["description"] = e.Description;
        if (e.Tags?.Count > 0) d["tags"] = e.Tags;
        if (e.Layer is not null) d["layer"] = e.Layer;
        if (e.Tech is not null) d["tech"] = e.Tech;
        if (e.Parent is not null) d["parent"] = e.Parent;
        if (e.Text is not null) d["text"] = e.Text;
        return d;
    }

    private static object RelToRaw(RelationshipModel r)
    {
        var d = new Dictionary<string, object?> { ["id"] = r.Id, ["from"] = r.From, ["to"] = r.To };
        if (r.Label is not null) d["label"] = r.Label;
        if (r.Type is not null) d["type"] = r.Type;
        return d;
    }

    private static object ViewToRaw(ViewModel v)
    {
        var d = new Dictionary<string, object?> { ["id"] = v.Id, ["type"] = v.Type };
        if (v.Name is not null) d["name"] = v.Name;
        if (v.Include?.Count > 0) d["include"] = v.Include;
        if (v.Layers?.Count > 0) d["layers"] = v.Layers.Select(l => new Dictionary<string, object?>
        {
            ["id"] = l.Id, ["name"] = l.Name, ["color"] = l.Color, ["include"] = l.Include
        }).ToList();
        if (v.DisplayLayers?.Count > 0) d["displayLayers"] = v.DisplayLayers.Select(dl => new Dictionary<string, object?>
        {
            ["id"] = dl.Id, ["zIndex"] = dl.ZIndex, ["visible"] = dl.Visible, ["elements"] = dl.Elements
        }).ToList();
        if (v.Layout is not null) d["layout"] = new { algorithm = v.Layout.Algorithm, direction = v.Layout.Direction };
        if (v.Positions?.Count > 0) d["positions"] = v.Positions.ToDictionary(
            kv => kv.Key,
            kv => new { x = kv.Value.X, y = kv.Value.Y });
        if (v.Styles is not null) d["styles"] = StylestoRaw(v.Styles);
        if (v.Theme is not null) d["theme"] = v.Theme;
        if (v.Participants?.Count > 0) d["participants"] = v.Participants;
        if (v.Steps?.Count > 0) d["steps"] = v.Steps.Select(StepToRaw).ToList();
        return d;
    }

    private static object StylestoRaw(ViewStyles s)
    {
        var d = new Dictionary<string, object?>();
        if (s.Elements?.Count > 0) d["elements"] = s.Elements.ToDictionary(
            kv => kv.Key, kv => ElementStyleToRaw(kv.Value));
        if (s.Relationships?.Count > 0) d["relationships"] = s.Relationships.ToDictionary(
            kv => kv.Key, kv => RelStyleToRaw(kv.Value));
        return d;
    }

    private static object ElementStyleToRaw(ElementStyleConfig s)
    {
        var d = new Dictionary<string, object?>();
        if (s.Color is not null) d["color"] = s.Color;
        if (s.Background is not null) d["background"] = s.Background;
        if (s.Icon is not null) d["icon"] = s.Icon;
        if (s.Shape is not null) d["shape"] = s.Shape;
        if (s.FontSize is not null) d["fontSize"] = s.FontSize;
        if (s.Width is not null) d["width"] = s.Width;
        if (s.Height is not null) d["height"] = s.Height;
        if (s.ContentAlign is not null) d["contentAlign"] = s.ContentAlign;
        if (s.LabelPlacement is not null) d["labelPlacement"] = s.LabelPlacement;
        return d;
    }

    private static object RelStyleToRaw(RelationshipStyleConfig s)
    {
        var d = new Dictionary<string, object?>();
        if (s.LineStyle is not null) d["lineStyle"] = s.LineStyle;
        if (s.ArrowEnd is not null) d["arrowEnd"] = s.ArrowEnd;
        if (s.ArrowStart is not null) d["arrowStart"] = s.ArrowStart;
        if (s.Color is not null) d["color"] = s.Color;
        if (s.Thickness is not null) d["thickness"] = s.Thickness;
        if (s.BendStyle is not null) d["bendStyle"] = s.BendStyle;
        if (s.LabelPosition is not null) d["labelPosition"] = s.LabelPosition;
        if (s.SourceHandle is not null) d["sourceHandle"] = s.SourceHandle;
        if (s.TargetHandle is not null) d["targetHandle"] = s.TargetHandle;
        if (s.Waypoints is { Count: > 0 })
            d["waypoints"] = s.Waypoints.Select(w => new Dictionary<string, object> { ["x"] = w.X, ["y"] = w.Y }).ToList();
        return d;
    }

    private static object StepToRaw(SequenceStep s)
    {
        var d = new Dictionary<string, object?>();
        if (s.From is not null) d["from"] = s.From;
        if (s.To is not null) d["to"] = s.To;
        if (s.Label is not null) d["label"] = s.Label;
        if (s.Type is not null) d["type"] = s.Type;
        if (s.Fragment is not null) d["fragment"] = s.Fragment;
        if (s.Condition is not null) d["condition"] = s.Condition;
        if (s.Steps?.Count > 0) d["steps"] = s.Steps.Select(StepToRaw).ToList();
        return d;
    }
}
