import os
import tempfile
import unittest
from pathlib import Path

from rename_pdfs import apply_customer_folder_mapping, extract_first_four_digits, load_panel_env


class RenamePdfsTests(unittest.TestCase):
    def test_extract_first_four_digits_from_filename(self):
        self.assertEqual(extract_first_four_digits('1234_abcd.pdf'), '1234')
        self.assertEqual(extract_first_four_digits('no_digits_here.pdf'), '')

    def test_load_panel_env_reads_panel_dotenv(self):
        for key in ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE']:
            os.environ.pop(key, None)

        load_panel_env()

        self.assertEqual(os.environ.get('DB_USER'), 'sa')
        self.assertEqual(os.environ.get('DB_PASSWORD'), 'kassenberlin')
        self.assertEqual(os.environ.get('DB_SERVER'), 'WIN11JTL\\JTLWAWI')
        self.assertEqual(os.environ.get('DB_DATABASE'), 'Mandant_2')

    def test_customer_folder_mapping_moves_bank_and_rechnung_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            bank_pdf = folder / '1234_test.pdf'
            bank_pdf.write_bytes(b'%PDF-1.4')

            invoice_pdf = folder / '5678_other.pdf'
            invoice_pdf.write_bytes(b'%PDF-1.4')

            customer_rows = [
                {'Kundennummer': '1234', 'Zahlungsart Auftrag': 'Bank'},
                {'Kundennummer': '5678', 'Zahlungsart Auftrag': 'Rechnung'},
            ]

            moved = apply_customer_folder_mapping(folder, customer_rows, recursive=False)

            self.assertEqual(len(moved), 2)
            self.assertTrue((folder / 'Bank' / '1234_test.pdf').exists())
            self.assertTrue((folder / 'Rechnung' / '5678_other.pdf').exists())
            self.assertFalse(bank_pdf.exists())
            self.assertFalse(invoice_pdf.exists())


if __name__ == '__main__':
    unittest.main()
