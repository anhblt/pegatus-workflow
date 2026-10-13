---
name: rule-backend-dotnet
description: Scoped backend Pegatus guidance.
---

Respect actual SDK/TFM, EF Core, SQL Server, runner and test framework. Load selected .NET skills only for matching tasks. .NET 11 APIs are conditional on detected target support, never a .NET 10 default. MSTest/Blazor/publishing resources need matching tasks. Follow solution test conventions; unavailable Docker integration checks are NOT RUN.

Adapted from ECC rules/common/testing.md; backend additions are Pegatus overlays. [Source license](../../../vendor/ecc/LICENSE).
