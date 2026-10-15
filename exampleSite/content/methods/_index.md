---
title: Methods
description: "How a kind of food or a cooking process works in general, so you can cook dishes that aren't written down anywhere."
# Everything in this folder is a method (docs/METHODS.md). This tags a
# method page that has no tags of its own; a page that sets `tags`
# replaces it, so list `method` there yourself (/lint checks).
# The target keeps it off this page and the blueprint pages
# (content/methods/<blueprint>/_index.md), which would otherwise show up as
# cards on the method tag page.
cascade:
  - target:
      path: "/methods/**"
      kind: page
    tags: [method]
---

A *method* is the pattern behind many dishes. A recipe is one specific dish; a method explains how that kind of food works, which variables matter, why each step is there, and how it fails, so you can cook something that isn't written down anywhere on this site. A *blueprint* breaks one kind of food into its parts, each with its own method, and the builds that combine them.
