#!/usr/bin/env python3
"""
HTML to PDF Converter

This script converts HTML files to PDF documents using pdfkit.
"""

import sys
import os
import pdfkit


class HtmlToPdfConverter:
    """Convert HTML files to PDF format."""

    def __init__(self):
        """Initialize the converter with pdfkit options."""
        self.options = {
            'page-size': 'A4',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None,
        }

    def convert_file(self, input_html, output_pdf):
        """
        Convert an HTML file to PDF.

        Args:
            input_html (str): Path to the input HTML file
            output_pdf (str): Path to the output PDF file

        Returns:
            bool: True if conversion was successful, False otherwise
        """
        try:
            if not os.path.exists(input_html):
                print(f"Error: Input file '{input_html}' not found.")
                return False

            pdfkit.from_file(input_html, output_pdf, options=self.options)
            print(f"Successfully converted '{input_html}' to '{output_pdf}'")
            return True

        except Exception as e:
            print(f"Error during conversion: {e}")
            return False

    def convert_string(self, html_string, output_pdf):
        """
        Convert an HTML string to PDF.

        Args:
            html_string (str): HTML content as a string
            output_pdf (str): Path to the output PDF file

        Returns:
            bool: True if conversion was successful, False otherwise
        """
        try:
            pdfkit.from_string(html_string, output_pdf, options=self.options)
            print(f"Successfully converted HTML string to '{output_pdf}'")
            return True

        except Exception as e:
            print(f"Error during conversion: {e}")
            return False

    def convert_url(self, url, output_pdf):
        """
        Convert an HTML page from a URL to PDF.

        Args:
            url (str): URL of the HTML page
            output_pdf (str): Path to the output PDF file

        Returns:
            bool: True if conversion was successful, False otherwise
        """
        try:
            pdfkit.from_url(url, output_pdf, options=self.options)
            print(f"Successfully converted '{url}' to '{output_pdf}'")
            return True

        except Exception as e:
            print(f"Error during conversion: {e}")
            return False


def main():
    """Main entry point for the command-line interface."""
    if len(sys.argv) < 3:
        print("Usage: python convert.py <input.html> <output.pdf>")
        print("\nExample:")
        print("  python convert.py sample.html output.pdf")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    converter = HtmlToPdfConverter()
    success = converter.convert_file(input_file, output_file)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
