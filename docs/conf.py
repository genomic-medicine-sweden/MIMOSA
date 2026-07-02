# Configuration file for the Sphinx documentation builder.

# -- Project information -----------------------------------------------------

project = "MIMOSA"
author = "Olivia Andersson"
#copyright =
version = "0.6"
release = "0.6.0"

# -- General configuration ---------------------------------------------------

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.autosummary",
    "sphinx.ext.intersphinx",
    "sphinx.ext.napoleon",
    "sphinx.ext.viewcode",
]

autosummary_generate = True

intersphinx_mapping = {
    "python": ("https://docs.python.org/3/", None),
    "sphinx": ("https://www.sphinx-doc.org/en/master/", None),
}

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

# -- Options for HTML output -------------------------------------------------

html_theme = "sphinx_rtd_theme"

html_static_path = ["_static"]

html_logo = "_static/MIMOSA_Logo.svg"

html_theme_options = {
    "logo_only": True,
    "style_nav_header_background": "#ffffff",
}

# -- Options for EPUB output -------------------------------------------------

epub_show_urls = "footnote"

