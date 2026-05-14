using Microsoft.AspNetCore.Mvc;
using Visualizer.Models;
using Visualizer.Services;
using Visualizer.Services.Export;

namespace Visualizer.Controllers;

[ApiController]
[Route("api/workspace")]
public class WorkspaceController(AmlParser parser, AmlFormatter formatter, AmlValidator validator, DrawIoExporter drawIoExporter) : ControllerBase
{
    // POST /api/workspace/parse
    [HttpPost("parse")]
    public ActionResult<ParseResponse> Parse([FromBody] DslRequest req)
    {
        var result = parser.Parse(req.Dsl ?? "");
        var extraErrors = result.Model is not null ? validator.Validate(result.Model) : [];
        return Ok(new ParseResponse(result.Model, [.. result.Errors, .. extraErrors]));
    }

    // POST /api/workspace/format
    [HttpPost("format")]
    public ActionResult<FormatResponse> Format([FromBody] WorkspaceModel model)
    {
        var dsl = formatter.Format(model);
        return Ok(new FormatResponse(dsl));
    }

    // POST /api/workspace/suggest
    // Returns layout and element suggestions derived from the workspace context.
    // Rule-based for now — designed to be replaced with an LLM call without
    // changing the contract.
    [HttpPost("suggest")]
    public ActionResult<SuggestResponse> Suggest([FromBody] WorkspaceModel model)
    {
        var ctx = model.Workspace.Context;
        var suggestions = new List<string>();
        var layoutHint = new LayoutHint("layered", "top-down");

        // ── Perspective-based layout hints ────────────────────────────────────
        var persp = (ctx?.Perspective ?? "").ToLowerInvariant();
        if (persp.Contains("sequence"))
            layoutHint = new LayoutHint("layered", "left-right");
        else if (persp.Contains("container") || persp.Contains("component"))
            layoutHint = new LayoutHint("layered", "top-down");
        else if (persp.Contains("infrastructure"))
            layoutHint = new LayoutHint("grid", "top-down");

        // ── Domain-based element suggestions ──────────────────────────────────
        var domain = (ctx?.Domain ?? "").ToLowerInvariant();
        var existingTypes = model.Model.Elements.Select(e => e.Type).ToHashSet();

        if (domain.Contains("e-commerce") || domain.Contains("commerce"))
        {
            if (!existingTypes.Contains("person"))
                suggestions.Add("Consider adding a Customer (person) element");
            if (!existingTypes.Contains("database"))
                suggestions.Add("Consider adding a Product Catalogue (database) element");
        }
        else if (domain.Contains("banking") || domain.Contains("finance"))
        {
            if (!existingTypes.Contains("system"))
                suggestions.Add("Consider adding a Core Banking System element");
        }

        // ── Scope-based completeness checks ───────────────────────────────────
        if (model.Model.Elements.Count == 0)
            suggestions.Add("No elements defined — start by adding the main system or actor");
        if (model.Model.Relationships.Count == 0 && model.Model.Elements.Count > 1)
            suggestions.Add("Elements exist but no relationships are drawn");
        if (model.Model.Elements.Count > 0 && model.Views.All(v => v.Include?.Count == 0))
            suggestions.Add("All views are empty — add elements to at least one view");

        // ── Audience-based style hints ─────────────────────────────────────────
        var audience = (ctx?.Audience ?? "").ToLowerInvariant();
        string? styleHint = null;
        if (audience.Contains("executive") || audience.Contains("business"))
            styleHint = "For a business audience, consider keeping element counts low (< 8) and using the 'corporate' theme";
        else if (audience.Contains("developer") || audience.Contains("engineer"))
            styleHint = "For a technical audience, component and database shapes with tech labels are recommended";

        if (styleHint is not null) suggestions.Add(styleHint);

        return Ok(new SuggestResponse(layoutHint, suggestions));
    }

    // POST /api/workspace/export/drawio
    [HttpPost("export/drawio")]
    public IActionResult ExportDrawIo([FromBody] WorkspaceModel model)
    {
        var xml = drawIoExporter.Export(model);
        return File(System.Text.Encoding.UTF8.GetBytes(xml), "application/xml", "diagram.drawio");
    }
}

public record DslRequest(string? Dsl);
public record ParseResponse(WorkspaceModel? Model, List<ParseError> Errors);
public record FormatResponse(string Dsl);
public record LayoutHint(string Algorithm, string Direction);
public record SuggestResponse(LayoutHint Layout, List<string> Suggestions);

