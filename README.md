# sharmaakash.com

Personal site and blog. Plain Jekyll, no theme gem, built by GitHub Pages.

## Write a post

Create `_posts/YYYY-MM-DD-slug.md`:

```markdown
---
title: "Post title"
subtitle: "Optional one-line dek"
tags: [systems, security]
---

Body in markdown.
```

Work-in-progress posts go in `_drafts/` (no date in the filename). They show up only with `--drafts`.
Images go in `images/` and are referenced as `/images/name.png`.

Callouts: put `{: .note }` or `{: .warn }` on the line after a paragraph.

## Run locally

With Docker:

```sh
docker run --rm -it -p 4000:4000 -v "$PWD:/srv/jekyll" -w /srv/jekyll ruby:3.3 \
  sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0 --drafts --livereload"
```

Or with Ruby installed: `bundle install && bundle exec jekyll serve --drafts`.

## Layout

```
_layouts/    default, page, post
_includes/   head, header, footer, prompt, post-row
assets/      site.css, site.js, favicon.svg
blogs/       /blogs/ index (posts grouped by year)
images/      post images
hi/, hum/    standalone pages
```
