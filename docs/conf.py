# Configuration file for the Sphinx documentation builder.

# -- Project information -----------------------------------------------------

project = "MIMOSA"
author = "Olivia Andersson"
#copyright = 
release = "0.5.0"
version = "0.5.0"

# -- General configuration ---------------------------------------------------

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.autosummary",
    "sphinx.ext.intersphinx",
    "sphinx.ext.napoleon",
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

# -- Options for EPUB output -------------------------------------------------

epub_show_urls = "footnote"
