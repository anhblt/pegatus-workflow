---
name: rule-backend-dotnet
description: Scoped backend Pegatus guidance.
---

Respect actual SDK/TFM, EF Core, SQL Server, runner and test framework. Load selected .NET skills only for matching tasks. .NET 11 APIs are conditional on detected target support, never a .NET 10 default. MSTest/Blazor/publishing resources need matching tasks. Follow solution test conventions; unavailable Docker integration checks are NOT RUN.

## C# implementation and review rules

- Start enums at `0` and use implicit sequential values. Obtain explicit human approval before assigning a numeric value to a member or changing an existing member's numeric value. Check for implicit renumbering when inserting, removing, or reordering members. If approval is needed, surface the affected values before making the edit.
- Require exactly one type declaration per `.cs` file. Classes, interfaces, structs, records, enums, and delegates count, including nested declarations. Follow applicable project instructions for file naming and placement while keeping each type declaration in its own file.
- Do not declare local functions in C#. Use a type-level method when a helper is needed.

Adapted from ECC rules/common/testing.md; backend additions are Pegatus overlays. [Source license](../../../vendor/ecc/LICENSE).
