from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path


ROLE_SPECS: dict[str, tuple[str, str]] = {
    "cto-lead": (
        "Set architecture, sequence work, and resolve technical tradeoffs.",
        "Decision log, ownership map, and top technical risks.",
    ),
    "product-strategist": (
        "Define scope, target user value, acceptance criteria, and release shape.",
        "Product brief, priorities, and non-goals.",
    ),
    "brainstorm-facilitator": (
        "Generate option sets, experiments, and naming or positioning directions.",
        "Ranked idea list with effort and upside notes.",
    ),
    "expo-platform-engineer": (
        "Own shared React Native and Expo implementation strategy.",
        "Shared-code plan, file targets, and integration risks.",
    ),
    "ios-engineer": (
        "Own iOS-specific platform behavior and Apple-facing constraints.",
        "iOS build notes, platform risks, and required native changes.",
    ),
    "android-engineer": (
        "Own Android-specific platform behavior and Play-facing constraints.",
        "Android build notes, platform risks, and required native changes.",
    ),
    "supabase-architect": (
        "Own schema, RLS, sync semantics, and backend safety.",
        "Migration plan, policy impacts, and data-contract notes.",
    ),
    "design-lead": (
        "Own UX flows, states, accessibility, and visual direction.",
        "Flow notes, UI states, and copy or accessibility risks.",
    ),
    "qa-release-manager": (
        "Own regression coverage, release gating, and launch readiness.",
        "Test matrix, release blockers, and verification checklist.",
    ),
    "growth-marketer": (
        "Own growth loops, funnel hypotheses, and launch experiments.",
        "Growth plan, experiment backlog, and positioning notes.",
    ),
    "social-media-manager": (
        "Own social rollout, content angles, and community touchpoints.",
        "Channel plan, post concepts, and launch cadence.",
    ),
    "aso-manager": (
        "Own store metadata, screenshot themes, and keyword strategy.",
        "Store listing updates and ASO hypotheses.",
    ),
    "data-analyst": (
        "Own instrumentation, metrics, and experiment measurement.",
        "Event plan, KPI definitions, and reporting requirements.",
    ),
    "customer-research-lead": (
        "Own interviews, feedback synthesis, and qualitative signal loops.",
        "Research plan, questions, and expected learning goals.",
    ),
}


def normalize_roles(raw_roles: str | None) -> list[str]:
    if raw_roles is None or raw_roles.strip().lower() in {"", "full-company", "all"}:
        return list(ROLE_SPECS.keys())

    roles = [role.strip() for role in raw_roles.split(",") if role.strip()]
    unknown = [role for role in roles if role not in ROLE_SPECS]
    if unknown:
        raise SystemExit(
            "Unknown role(s): "
            + ", ".join(unknown)
            + "\nValid roles: "
            + ", ".join(ROLE_SPECS.keys())
        )
    return roles


def build_markdown(
    task: str,
    roles: list[str],
    metric: str | None,
    deadline: str | None,
    notes: str | None,
) -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = [
        "# Mobile Startup Studio Workboard",
        "",
        f"Generated: {timestamp}",
        "",
        "## Shared Brief",
        f"- Task: {task}",
        f"- Success metric: {metric or 'TBD'}",
        f"- Deadline: {deadline or 'TBD'}",
        f"- Notes: {notes or 'None yet'}",
        "",
        "## Constraints",
        "- Mobile-first behavior",
        "- Offline tolerance and retry semantics",
        "- Secure auth, data handling, and store compliance",
        "- Explicit ownership before implementation",
        "",
        "## Role Lanes",
        "| Role | Mission | Deliverable | Status | Dependencies |",
        "| --- | --- | --- | --- | --- |",
    ]

    for role in roles:
        mission, deliverable = ROLE_SPECS[role]
        lines.append(
            f"| {role} | {mission} | {deliverable} | queued | none |"
        )

    lines.extend(
        [
            "",
            "## Integration Log",
            "- Decision owner:",
            "- Open conflicts:",
            "- Re-broadcast needed:",
            "",
            "## Risks",
            "- Product risk:",
            "- Engineering risk:",
            "- Launch risk:",
            "",
            "## Verification",
            "- Code and architecture review",
            "- Platform-specific checks",
            "- Data and analytics validation",
            "- Go-to-market asset review",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a shared workboard for Mobile Startup Studio."
    )
    parser.add_argument("--task", required=True, help="Primary startup task or initiative.")
    parser.add_argument(
        "--roles",
        help="Comma-separated role list, or omit for full-company.",
    )
    parser.add_argument("--metric", help="Success metric or KPI.")
    parser.add_argument("--deadline", help="Deadline or milestone.")
    parser.add_argument("--notes", help="Extra context to place into the brief.")
    parser.add_argument("--output", help="Optional output path for the markdown workboard.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    roles = normalize_roles(args.roles)
    markdown = build_markdown(args.task, roles, args.metric, args.deadline, args.notes)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(markdown, encoding="utf-8")
        print(f"Wrote workboard to {output_path}")
        return 0

    print(markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
