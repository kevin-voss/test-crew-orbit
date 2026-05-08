# HTML to PDF Converter

A Python utility to convert HTML files to PDF documents.

## Description

This project provides a simple and efficient way to convert HTML files to PDF format. It uses the `pdfkit` library, which wraps wkhtmltopdf, to generate high-quality PDF documents from HTML sources.

## Features

- Convert HTML files to PDF
- Convert HTML strings to PDF
- Support for custom styling and formatting
- Simple command-line interface

## Installation

### Prerequisites

- Python 3.6 or higher
- wkhtmltopdf (required by pdfkit)

### Setup

1. Clone or download this project
2. Install Python dependencies:

```bash
pip install pdfkit
```

3. Install wkhtmltopdf:

**On Ubuntu/Debian:**
```bash
sudo apt-get install wkhtmltopdf
```

**On macOS (with Homebrew):**
```bash
brew install --cask wkhtmltopdf
```

**On Windows:**
Download and install from https://wkhtmltopdf.org/downloads.html

## Usage

### Convert an HTML file to PDF

```bash
python convert.py input.html output.pdf
```

### Convert HTML string to PDF

You can also use the `HtmlToPdfConverter` class in your Python code:

```python
from convert import HtmlToPdfConverter

converter = HtmlToPdfConverter()
converter.convert_file('input.html', 'output.pdf')
```

## Files

- `convert.py` - Main Python script for HTML to PDF conversion
- `sample.html` - Sample HTML file demonstrating conversion capabilities
- `README.md` - This documentation file

## Example

```bash
python convert.py sample.html sample_output.pdf
```

This will generate `sample_output.pdf` from the `sample.html` file.

## License

MIT License
