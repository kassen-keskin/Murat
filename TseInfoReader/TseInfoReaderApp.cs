using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Drawing;
using System.ComponentModel;
using System.Reflection;
using System.Data.SqlClient;
using System.Collections.Generic;

namespace TseInfoReader
{
    public class ConfirmForm : Form
    {
        public ConfirmForm(string customerInfo, string oldSerial, string newSerial, string oldDesc, string newDesc, string oldDate, string newDate, bool isDarkMode)
        {
            this.Text = "Onay - Veritabanına Aktar";
            this.Size = new Size(900, 500);
            this.StartPosition = FormStartPosition.CenterParent;
            this.MinimizeBox = false;
            this.MaximizeBox = false;

            TableLayoutPanel layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.RowCount = 3;
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 60));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 80));
            layout.ColumnCount = 1;

            Label lblCustomer = new Label();
            lblCustomer.Text = customerInfo;
            lblCustomer.Font = new Font(lblCustomer.Font.FontFamily, 16, FontStyle.Bold);
            lblCustomer.Dock = DockStyle.Fill;
            lblCustomer.TextAlign = ContentAlignment.MiddleCenter;

            TableLayoutPanel splitLayout = new TableLayoutPanel();
            splitLayout.Dock = DockStyle.Fill;
            splitLayout.RowCount = 1;
            splitLayout.ColumnCount = 2;
            splitLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            splitLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));

            Label lblOld = new Label();
            lblOld.Text = string.Format("ESKİ BİLGİLER\n\nTSE Seri No:\n{0}\n\nTSE BSI Kodu:\n{1}\n\nBitiş Tarihi:\n{2}", 
                string.IsNullOrEmpty(oldSerial) ? "Yok" : oldSerial,
                string.IsNullOrEmpty(oldDesc) ? "Yok" : oldDesc,
                string.IsNullOrEmpty(oldDate) ? "Yok" : oldDate);
            lblOld.Font = new Font(lblOld.Font.FontFamily, 12, FontStyle.Regular);
            lblOld.Dock = DockStyle.Fill;
            lblOld.TextAlign = ContentAlignment.TopLeft;
            lblOld.Margin = new Padding(20);

            Label lblNew = new Label();
            lblNew.Text = string.Format("YENİ BİLGİLER\n\nTSE Seri No:\n{0}\n\nTSE BSI Kodu:\n{1}\n\nBitiş Tarihi:\n{2}", 
                string.IsNullOrEmpty(newSerial) ? "Yok" : newSerial,
                string.IsNullOrEmpty(newDesc) ? "Yok" : newDesc,
                string.IsNullOrEmpty(newDate) ? "Yok" : newDate);
            lblNew.Font = new Font(lblNew.Font.FontFamily, 12, FontStyle.Bold);
            lblNew.Dock = DockStyle.Fill;
            lblNew.TextAlign = ContentAlignment.TopLeft;
            lblNew.Margin = new Padding(20);

            splitLayout.Controls.Add(lblOld, 0, 0);
            splitLayout.Controls.Add(lblNew, 1, 0);

            Button btnSave = new Button();
            btnSave.Text = "KAYDET";
            btnSave.Font = new Font(btnSave.Font.FontFamily, 20, FontStyle.Bold);
            btnSave.ForeColor = Color.Red;
            btnSave.Dock = DockStyle.Fill;
            btnSave.Margin = new Padding(20, 10, 20, 10);
            btnSave.DialogResult = DialogResult.OK;

            layout.Controls.Add(lblCustomer, 0, 0);
            layout.Controls.Add(splitLayout, 0, 1);
            layout.Controls.Add(btnSave, 0, 2);

            this.Controls.Add(layout);
            this.AcceptButton = btnSave;

            if (isDarkMode)
            {
                this.BackColor = Color.FromArgb(45, 45, 48);
                this.ForeColor = Color.White;
                btnSave.BackColor = Color.FromArgb(63, 63, 70);
                btnSave.FlatStyle = FlatStyle.Flat;
                btnSave.FlatAppearance.BorderColor = Color.Gray;
            }
        }
    }

    public class TseStatus
    {
        [Category("Sonstiges")]
        public ulong CertificateExpirationDate { get; internal set; }
        
        [Category("Sonstiges")]
        public string CertificateExpirationDateTimeOffset { get; internal set; }

        [Category("Sonstiges")]
        public uint CreatedSignatures { get; internal set; }

        [Category("Sonstiges")]
        public string CspKeyReference { get; internal set; }

        [Category("Sonstiges")]
        public bool DataImportInitialized { get; internal set; }

        [Category("Sonstiges")]
        public uint FirmwareId { get; internal set; }

        [Category("Sonstiges")]
        public string FirmwareType { get; internal set; }

        [Category("Sonstiges")]
        public bool InitialAdminPinChanged { get; internal set; }

        [Category("Sonstiges")]
        public bool InitialPukChanged { get; internal set; }

        [Category("Sonstiges")]
        public bool InitialTimeAdminPinChanged { get; internal set; }

        [Category("Sonstiges")]
        public uint LastHeaderBlockIndex { get; internal set; }

        [Category("Sonstiges")]
        public uint MaxRegisteredClients { get; internal set; }

        [Category("Sonstiges")]
        public uint MaxSignatures { get; internal set; }

        [Category("Sonstiges")]
        public uint MaxStartedTransactions { get; internal set; }

        [Category("Sonstiges")]
        public uint MaxTimeSynchronizationDelay { get; internal set; }

        [Category("Sonstiges")]
        public uint MaxUpdateDelay { get; internal set; }

        [Category("Sonstiges")]
        public uint RegisteredClients { get; internal set; }

        [Category("Sonstiges")]
        public uint StartedTransactions { get; internal set; }

        [Category("Sonstiges")]
        public uint TimeUntilNextSelftest { get; internal set; }

        [Category("Sonstiges")]
        public uint TseCapacity { get; internal set; }

        [Category("Sonstiges")]
        public uint TseCurrentSize { get; internal set; }

        [Category("Sonstiges")]
        public string TseDescription { get; internal set; }

        [Category("Sonstiges")]
        public ulong TseExportSize { get; internal set; }

        [Category("Sonstiges")]
        public string TseFormFactor { get; internal set; }

        [Category("Sonstiges")]
        public string TseHardwareVersion { get; internal set; }

        [Category("Sonstiges")]
        public string TseInitializationState { get; internal set; }

        [Category("TsePublicKey")]
        public byte[] TsePublicKey { get; internal set; }

        [Category("TsePublicKey")]
        public ushort TsePublicKeyLength { get; internal set; }

        [Category("TsePublicKey")]
        public string TsePublicKeyString { get; internal set; }

        [Category("Sonstiges")]
        public byte TseSecurity { get; internal set; }

        [Category("Sonstiges")]
        public bool TseSecurityCtssInterfaceActive { get; internal set; }

        [Category("Sonstiges")]
        public bool TseSecuritySelfTestPassed { get; internal set; }

        [Category("Sonstiges")]
        public bool TseSecurityValidTimeSet { get; internal set; }

        [Category("Sonstiges")]
        public string TseSerial { get; internal set; }

        [Category("Sonstiges")]
        public string TseSoftwareVersion { get; internal set; }

        [Category("Sonstiges")]
        public bool TseTsecurityExportAllowedIfCspTestFails { get; internal set; }
    }

    public class CustomerItem
    {
        public int kKunde { get; set; }
        public string DisplayText { get; set; }
        public override string ToString() { return DisplayText; }
    }

    public class MainForm : Form
    {
        private PropertyGrid propertyGrid;
        private Button btnScan;
        private Label lblStatus;
        private Label lblDriveInfo;
        private ComboBox cmbCustomers;
        private TextBox txtSearch;
        private Label lblCount;
        private Button btnExportDb;
        private Button btnThemeToggle;
        private string sqlConnectionString;
        private List<CustomerItem> allCustomers = new List<CustomerItem>();
        private bool isDarkMode = false;
        private FlowLayoutPanel topPanel;

        public MainForm()
        {
            this.Text = "TSE Info Reader";
            this.Size = new Size(800, 700);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.WindowState = FormWindowState.Maximized;
            this.Font = new Font("Segoe UI", 12, FontStyle.Regular);

            TableLayoutPanel layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.RowCount = 3;
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            layout.ColumnCount = 1;

            topPanel = new FlowLayoutPanel();
            topPanel.Dock = DockStyle.Fill;
            topPanel.WrapContents = true;
            topPanel.AutoSize = true;
            topPanel.AutoSizeMode = AutoSizeMode.GrowAndShrink;

            Font largeFont = new Font("Segoe UI", 14, FontStyle.Bold);
            Font normalFont = new Font("Segoe UI", 14, FontStyle.Regular);

            btnScan = new Button();
            btnScan.Text = "Otomatik Tara (USB Bul)";
            btnScan.Size = new Size(260, 50);
            btnScan.Margin = new Padding(3, 8, 3, 3);
            btnScan.Font = largeFont;
            btnScan.Click += BtnScan_Click;

            lblDriveInfo = new Label();
            lblDriveInfo.Text = "Sürücü: -";
            lblDriveInfo.AutoSize = true;
            lblDriveInfo.Margin = new Padding(15, 20, 10, 3);
            lblDriveInfo.Font = largeFont;

            Label lblSearch = new Label();
            lblSearch.Text = "Ara:";
            lblSearch.AutoSize = true;
            lblSearch.Margin = new Padding(15, 20, 3, 3);
            lblSearch.Font = largeFont;

            txtSearch = new TextBox();
            txtSearch.Size = new Size(200, 35);
            txtSearch.Margin = new Padding(3, 16, 3, 3);
            txtSearch.Font = normalFont;
            txtSearch.TextChanged += TxtSearch_TextChanged;

            lblCount = new Label();
            lblCount.Text = "0/0";
            lblCount.AutoSize = true;
            lblCount.Margin = new Padding(5, 20, 15, 3);
            lblCount.Font = largeFont;

            Label lblCmb = new Label();
            lblCmb.Text = "Müşteri:";
            lblCmb.AutoSize = true;
            lblCmb.Margin = new Padding(15, 20, 3, 3);
            lblCmb.Font = largeFont;
            
            cmbCustomers = new ComboBox();
            cmbCustomers.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbCustomers.Size = new Size(500, 35);
            cmbCustomers.Margin = new Padding(3, 16, 15, 3);
            cmbCustomers.Font = normalFont;
            
            btnExportDb = new Button();
            btnExportDb.Text = "Veritabanına Aktar";
            btnExportDb.Size = new Size(220, 50);
            btnExportDb.Margin = new Padding(3, 8, 3, 3);
            btnExportDb.Font = largeFont;
            btnExportDb.Click += BtnExportDb_Click;
            btnExportDb.Enabled = false;

            btnThemeToggle = new Button();
            btnThemeToggle.Text = "Koyu Tema";
            btnThemeToggle.Size = new Size(150, 50);
            btnThemeToggle.Margin = new Padding(3, 8, 3, 3);
            btnThemeToggle.Font = largeFont;
            btnThemeToggle.Click += BtnThemeToggle_Click;

            topPanel.Controls.Add(btnScan);
            topPanel.Controls.Add(lblDriveInfo);
            topPanel.Controls.Add(lblSearch);
            topPanel.Controls.Add(txtSearch);
            topPanel.Controls.Add(lblCount);
            topPanel.Controls.Add(lblCmb);
            topPanel.Controls.Add(cmbCustomers);
            topPanel.Controls.Add(btnExportDb);
            topPanel.Controls.Add(btnThemeToggle);

            propertyGrid = new PropertyGrid();
            propertyGrid.Dock = DockStyle.Fill;
            propertyGrid.Font = new Font("Segoe UI", 12, FontStyle.Regular);
            propertyGrid.PropertySort = PropertySort.Categorized;
            propertyGrid.ToolbarVisible = false;
            propertyGrid.SelectedGridItemChanged += PropertyGrid_SelectedGridItemChanged;

            lblStatus = new Label();
            lblStatus.Text = "Hazır.";
            lblStatus.Dock = DockStyle.Fill;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            lblStatus.Text = "Hazır. Lütfen tara butonuna basın. (Üzerine tıkladığınız değerler otomatik kopyalanır)";

            layout.Controls.Add(topPanel, 0, 0);
            layout.Controls.Add(propertyGrid, 0, 1);
            layout.Controls.Add(lblStatus, 0, 2);

            this.Controls.Add(layout);
            
            this.Load += MainForm_Load;
            
            ApplyTheme();
        }

        private void BtnThemeToggle_Click(object sender, EventArgs e)
        {
            isDarkMode = !isDarkMode;
            ApplyTheme();
        }

        private void ApplyTheme()
        {
            Color backColor = isDarkMode ? Color.FromArgb(45, 45, 48) : SystemColors.Control;
            Color foreColor = isDarkMode ? Color.White : SystemColors.ControlText;
            Color inputBackColor = isDarkMode ? Color.FromArgb(60, 60, 60) : SystemColors.Window;
            Color inputForeColor = isDarkMode ? Color.White : SystemColors.WindowText;
            Color buttonBackColor = isDarkMode ? Color.FromArgb(63, 63, 70) : SystemColors.Control;
            
            this.BackColor = backColor;
            this.ForeColor = foreColor;

            foreach (Control c in topPanel.Controls)
            {
                if (c is Label)
                {
                    c.ForeColor = foreColor;
                }
                else if (c is Button)
                {
                    c.BackColor = buttonBackColor;
                    c.ForeColor = (c == btnExportDb) ? (isDarkMode ? Color.LightCoral : Color.Red) : foreColor;
                    if (c == btnExportDb && !isDarkMode) c.ForeColor = SystemColors.ControlText;
                    ((Button)c).FlatStyle = FlatStyle.Flat;
                    ((Button)c).FlatAppearance.BorderColor = isDarkMode ? Color.Gray : Color.LightGray;
                }
                else if (c is TextBox || c is ComboBox)
                {
                    c.BackColor = inputBackColor;
                    c.ForeColor = inputForeColor;
                    if (c is ComboBox) ((ComboBox)c).FlatStyle = isDarkMode ? FlatStyle.Flat : FlatStyle.Standard;
                    else if (c is TextBox) ((TextBox)c).BorderStyle = isDarkMode ? BorderStyle.FixedSingle : BorderStyle.Fixed3D;
                }
            }

            lblStatus.ForeColor = foreColor;
            lblStatus.BackColor = backColor;

            propertyGrid.BackColor = backColor;
            propertyGrid.ViewBackColor = backColor;
            propertyGrid.ViewForeColor = foreColor;
            propertyGrid.LineColor = isDarkMode ? Color.FromArgb(63, 63, 70) : SystemColors.ControlDark;
            propertyGrid.CategoryForeColor = isDarkMode ? Color.LightSkyBlue : SystemColors.ControlText;
            propertyGrid.CategorySplitterColor = isDarkMode ? Color.FromArgb(45, 45, 48) : SystemColors.Control;
            propertyGrid.HelpBackColor = backColor;
            propertyGrid.HelpForeColor = foreColor;

            btnThemeToggle.Text = isDarkMode ? "Açık Tema" : "Koyu Tema";
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            LoadDatabaseConfig();
            LoadCustomersFromDb();
        }

        private void LoadDatabaseConfig()
        {
            string envFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "TseInfoReader.env");
            string server = "";
            string db = "";
            string user = "";
            string pass = "";

            if (File.Exists(envFile))
            {
                var lines = File.ReadAllLines(envFile);
                foreach (var line in lines)
                {
                    if (line.StartsWith("DB_SERVER=")) server = line.Substring(10).Trim();
                    else if (line.StartsWith("DB_DATABASE=")) db = line.Substring(12).Trim();
                    else if (line.StartsWith("DB_USER=")) user = line.Substring(8).Trim();
                    else if (line.StartsWith("DB_PASSWORD=")) pass = line.Substring(12).Trim();
                }
                
                if (!string.IsNullOrEmpty(server) && !string.IsNullOrEmpty(db))
                {
                    SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder();
                    builder.DataSource = server;
                    builder.InitialCatalog = db;
                    if (!string.IsNullOrEmpty(user))
                    {
                        builder.UserID = user;
                        builder.Password = pass;
                    }
                    else
                    {
                        builder.IntegratedSecurity = true;
                    }
                    sqlConnectionString = builder.ConnectionString;
                }
            }
            else
            {
                lblStatus.Text = "TseInfoReader.env dosyası bulunamadı, SQL bağlantısı yapılamayacak.";
            }
        }

        private void LoadCustomersFromDb()
        {
            if (string.IsNullOrEmpty(sqlConnectionString)) return;

            try
            {
                using (SqlConnection conn = new SqlConnection(sqlConnectionString))
                {
                    conn.Open();
                    string query = "SELECT kKunde, KundenNr, Firma, InhabeName, FirmaAdress FROM [Custom].[Kunde] WHERE TRY_CAST(KundenNr AS INT) >= 1000 ORDER BY KundenNr";
                    using (SqlCommand cmd = new SqlCommand(query, conn))
                    {
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int id = reader.GetInt32(0);
                                string nr = reader.IsDBNull(1) ? "" : reader.GetString(1);
                                string firma = reader.IsDBNull(2) ? "" : reader.GetString(2);
                                string inhabe = reader.IsDBNull(3) ? "" : reader.GetString(3);
                                string addr = reader.IsDBNull(4) ? "" : reader.GetString(4);

                                string display = string.Format("{0}-{1}-{2}-{3}", nr, firma, inhabe, addr);

                                allCustomers.Add(new CustomerItem { kKunde = id, DisplayText = display });
                            }
                        }
                    }
                }
                FilterCustomers("");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Müşteriler yüklenirken hata oluştu: " + ex.Message, "SQL Hata", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void TxtSearch_TextChanged(object sender, EventArgs e)
        {
            FilterCustomers(txtSearch.Text);
        }

        private void FilterCustomers(string query)
        {
            cmbCustomers.Items.Clear();

            if (string.IsNullOrWhiteSpace(query))
            {
                cmbCustomers.Items.Add(new CustomerItem { kKunde = 0, DisplayText = "--- Lütfen Seçiniz ---" });
                cmbCustomers.Items.AddRange(allCustomers.ToArray());
                
                lblCount.Text = (cmbCustomers.Items.Count - 1) + "/" + allCustomers.Count;
                if (cmbCustomers.Items.Count > 0)
                    cmbCustomers.SelectedIndex = 0;
            }
            else
            {
                var filtered = allCustomers.Where(c => c.DisplayText.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0).ToArray();
                cmbCustomers.Items.AddRange(filtered);
                
                lblCount.Text = cmbCustomers.Items.Count + "/" + allCustomers.Count;
                if (cmbCustomers.Items.Count > 0)
                    cmbCustomers.SelectedIndex = 0;
            }
        }

        private void BtnExportDb_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(sqlConnectionString))
            {
                MessageBox.Show("Veritabanı bağlantı ayarları eksik!", "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            
            CustomerItem selectedCustomer = cmbCustomers.SelectedItem as CustomerItem;
            if (selectedCustomer == null || selectedCustomer.kKunde == 0)
            {
                MessageBox.Show("Lütfen geçerli bir müşteri seçin.", "Hata", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            TseStatus status = propertyGrid.SelectedObject as TseStatus;
            if (status == null || string.IsNullOrEmpty(status.TseSerial))
            {
                MessageBox.Show("Lütfen önce USB'yi tarayıp TSE verilerini okuyun.", "Hata", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string oldSerial = "";
            string oldDesc = "";
            string oldDate = "";

            try
            {
                using (SqlConnection conn = new SqlConnection(sqlConnectionString))
                {
                    conn.Open();
                    string fetchSql = "SELECT kAttribut, cWertVarchar, dWertDateTime FROM [Kunde].[tKundeEigenesFeld] WHERE kKunde = @kKunde AND kAttribut IN (244, 246, 247)";
                    using (SqlCommand cmd = new SqlCommand(fetchSql, conn))
                    {
                        cmd.Parameters.AddWithValue("@kKunde", selectedCustomer.kKunde);
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int attr = reader.GetInt32(0);
                                if (attr == 244)
                                    oldSerial = reader.IsDBNull(1) ? "" : reader.GetString(1);
                                else if (attr == 247)
                                    oldDesc = reader.IsDBNull(1) ? "" : reader.GetString(1);
                                else if (attr == 246)
                                    oldDate = reader.IsDBNull(2) ? "" : reader.GetDateTime(2).ToString("dd.MM.yyyy HH:mm:ss");
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Eski veriler çekilirken hata oluştu: " + ex.Message, "SQL Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            DateTime? newDateObj = null;
            string newDateStr = "Geçersiz/Tanımsız";
            long seconds = unchecked((long)status.CertificateExpirationDate);
            if (seconds > -62135596800L && seconds < 253402300799L && status.CertificateExpirationDate > 0)
            {
                newDateObj = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(seconds);
                newDateStr = newDateObj.Value.ToString("dd.MM.yyyy HH:mm:ss");
            }

            using (ConfirmForm cf = new ConfirmForm(selectedCustomer.DisplayText, oldSerial, status.TseSerial, oldDesc, status.TseDescription, oldDate, newDateStr, isDarkMode))
            {
                if (cf.ShowDialog(this) != DialogResult.OK)
                {
                    return; // Iptal edildi
                }
            }

            try
            {
                using (SqlConnection conn = new SqlConnection(sqlConnectionString))
                {
                    conn.Open();
                    using (SqlTransaction tx = conn.BeginTransaction())
                    {
                        // 1. TseSerial -> 244
                        UpsertStringField(conn, tx, selectedCustomer.kKunde, 244, status.TseSerial);
                        
                        // 2. TseDescription -> 247
                        UpsertStringField(conn, tx, selectedCustomer.kKunde, 247, status.TseDescription);

                        // 3. CertificateExpirationDate -> 246 (dWertDateTime)
                        if (newDateObj.HasValue)
                        {
                            UpsertDateTimeField(conn, tx, selectedCustomer.kKunde, 246, newDateObj.Value);
                        }

                        tx.Commit();
                    }
                }
                MessageBox.Show("Veriler SQL veritabanına başarıyla aktarıldı!", "Başarılı", MessageBoxButtons.OK, MessageBoxIcon.Information);
                lblStatus.Text = "Aktarım başarılı.";
            }
            catch (Exception ex)
            {
                MessageBox.Show("Aktarım sırasında hata oluştu:\n" + ex.Message, "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void UpsertStringField(SqlConnection conn, SqlTransaction tx, int kKunde, int kAttribut, string value)
        {
            string checkSql = "SELECT 1 FROM [Kunde].[tKundeEigenesFeld] WHERE kKunde = @kKunde AND kAttribut = @kAttribut";
            bool exists = false;
            using (SqlCommand cmdCheck = new SqlCommand(checkSql, conn, tx))
            {
                cmdCheck.Parameters.AddWithValue("@kKunde", kKunde);
                cmdCheck.Parameters.AddWithValue("@kAttribut", kAttribut);
                exists = cmdCheck.ExecuteScalar() != null;
            }

            string sql = exists ?
                "UPDATE [Kunde].[tKundeEigenesFeld] SET cWertVarchar = @val WHERE kKunde = @kKunde AND kAttribut = @kAttribut" :
                "INSERT INTO [Kunde].[tKundeEigenesFeld] (kKunde, kAttribut, cWertVarchar) VALUES (@kKunde, @kAttribut, @val)";
            
            using (SqlCommand cmd = new SqlCommand(sql, conn, tx))
            {
                cmd.Parameters.AddWithValue("@kKunde", kKunde);
                cmd.Parameters.AddWithValue("@kAttribut", kAttribut);
                cmd.Parameters.AddWithValue("@val", value ?? (object)DBNull.Value);
                cmd.ExecuteNonQuery();
            }
        }

        private void UpsertDateTimeField(SqlConnection conn, SqlTransaction tx, int kKunde, int kAttribut, DateTime value)
        {
            string checkSql = "SELECT 1 FROM [Kunde].[tKundeEigenesFeld] WHERE kKunde = @kKunde AND kAttribut = @kAttribut";
            bool exists = false;
            using (SqlCommand cmdCheck = new SqlCommand(checkSql, conn, tx))
            {
                cmdCheck.Parameters.AddWithValue("@kKunde", kKunde);
                cmdCheck.Parameters.AddWithValue("@kAttribut", kAttribut);
                exists = cmdCheck.ExecuteScalar() != null;
            }

            string sql = exists ?
                "UPDATE [Kunde].[tKundeEigenesFeld] SET dWertDateTime = @val WHERE kKunde = @kKunde AND kAttribut = @kAttribut" :
                "INSERT INTO [Kunde].[tKundeEigenesFeld] (kKunde, kAttribut, dWertDateTime) VALUES (@kKunde, @kAttribut, @val)";
            
            using (SqlCommand cmd = new SqlCommand(sql, conn, tx))
            {
                cmd.Parameters.AddWithValue("@kKunde", kKunde);
                cmd.Parameters.AddWithValue("@kAttribut", kAttribut);
                cmd.Parameters.AddWithValue("@val", value);
                cmd.ExecuteNonQuery();
            }
        }

        private void PropertyGrid_SelectedGridItemChanged(object sender, SelectedGridItemChangedEventArgs e)
        {
            if (e.NewSelection != null && e.NewSelection.Value != null)
            {
                string val = e.NewSelection.Value.ToString();
                if (!string.IsNullOrEmpty(val))
                {
                    try
                    {
                        Clipboard.SetText(val);
                        lblStatus.Text = string.Format("Kopyalandı: {0}", val);
                    }
                    catch
                    {
                        // Ignore clipboard access errors
                    }
                }
            }
        }

        private uint ReadUInt32BE(byte[] data, int offset)
        {
            return (uint)((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]);
        }

        private uint ReadUInt32LE(byte[] data, int offset)
        {
            return (uint)(data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24));
        }

        private ulong ReadUInt64BE(byte[] data, int offset)
        {
            return ((ulong)ReadUInt32BE(data, offset) << 32) | ReadUInt32BE(data, offset + 4);
        }

        private ushort ReadUInt16BE(byte[] data, int offset)
        {
            return (ushort)((data[offset] << 8) | data[offset + 1]);
        }
        
        private ushort ReadUInt16LE(byte[] data, int offset)
        {
            return (ushort)(data[offset] | (data[offset + 1] << 8));
        }

        private void BtnScan_Click(object sender, EventArgs e)
        {
            lblStatus.Text = "USB sürücüler aranıyor...";
            btnScan.Enabled = false;
            Application.DoEvents();

            try
            {
                var drives = DriveInfo.GetDrives().Where(d => d.DriveType == DriveType.Removable).ToList();
                string foundPath = null;

                foreach (var drive in drives)
                {
                    if (drive.IsReady)
                    {
                        string path = Path.Combine(drive.RootDirectory.FullName, "TSE_INFO.DAT");
                        if (File.Exists(path))
                        {
                            foundPath = path;
                            break;
                        }
                    }
                }

                if (foundPath != null)
                {
                    lblDriveInfo.Text = "Sürücü: " + Path.GetPathRoot(foundPath);
                    lblStatus.Text = string.Format("Bulundu: {0}. Veriler okunuyor...", foundPath);
                    ParseTseFile(foundPath);
                    btnExportDb.Enabled = true;
                }
                else
                {
                    lblDriveInfo.Text = "Sürücü: Yok";
                    lblStatus.Text = "Hiçbir USB sürücüde TSE_INFO.DAT dosyası bulunamadı!";
                    propertyGrid.SelectedObject = null;
                    btnExportDb.Enabled = false;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Hata oluştu: " + ex.Message, "Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.Text = "Bir hata oluştu.";
            }
            finally
            {
                btnScan.Enabled = true;
            }
        }

        private void ParseTseFile(string filePath)
        {
            byte[] b = new byte[512];
            using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                fs.Read(b, 0, 512);
            }

            TseStatus status = new TseStatus();

            try { status.FirmwareType = Encoding.ASCII.GetString(b, 4, 4).TrimEnd('\0'); } catch { }
            try { status.FirmwareId = ReadUInt32LE(b, 4); } catch { }
            try { status.TseCapacity = ReadUInt32BE(b, 20); } catch { }
            try { status.TseCurrentSize = ReadUInt32BE(b, 24); } catch { }
            
            try { status.TseSecurity = b[28]; } catch { }
            try { status.TseSecurityValidTimeSet = (b[28] & 1) == 1; } catch { }
            try { status.TseSecuritySelfTestPassed = (b[28] & 2) == 2; } catch { }
            try { status.TseSecurityCtssInterfaceActive = (b[28] & 4) == 4; } catch { }
            try { status.TseTsecurityExportAllowedIfCspTestFails = (b[28] & 8) == 8; } catch { }

            try { status.DataImportInitialized = b[30] != 0; } catch { } // Assuming boolean is non-zero
            
            try { status.InitialPukChanged = (b[32] & 1) == 1; } catch { }
            try { status.InitialAdminPinChanged = (b[32] & 2) == 2; } catch { }
            try { status.InitialTimeAdminPinChanged = (b[32] & 4) == 4; } catch { }

            try { status.TimeUntilNextSelftest = ReadUInt32BE(b, 36); } catch { }
            try { status.StartedTransactions = ReadUInt32BE(b, 40); } catch { }
            try { status.MaxStartedTransactions = ReadUInt32BE(b, 44); } catch { }
            try { status.CreatedSignatures = ReadUInt32BE(b, 48); } catch { }
            try { status.MaxSignatures = ReadUInt32BE(b, 52); } catch { }
            try { status.RegisteredClients = ReadUInt32BE(b, 56); } catch { }
            try { status.MaxRegisteredClients = ReadUInt32BE(b, 60); } catch { }

            try 
            {
                ulong exp = ReadUInt64BE(b, 64);
                status.CertificateExpirationDate = exp;
                long seconds = unchecked((long)exp);
                if (seconds > 253402300799L || seconds < -62135596800L) {
                    status.CertificateExpirationDateTimeOffset = "Invalid/Uninitialized";
                } else {
                    DateTime dt = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(seconds);
                    status.CertificateExpirationDateTimeOffset = dt.ToString("dd.MM.yyyy HH:mm:ss") + " +00:00";
                }
            } catch { }

            try 
            {
                ushort hwMajor = ReadUInt16BE(b, 80);
                byte hwMinor = b[82];
                byte hwBuild = b[83];
                status.TseHardwareVersion = hwMajor + "." + hwMinor + "." + hwBuild;
            } catch { }

            try 
            {
                ushort swMajor = ReadUInt16BE(b, 84);
                byte swMinor = b[86];
                byte swBuild = b[87];
                status.TseSoftwareVersion = swMajor + "." + swMinor + "." + swBuild;
            } catch { }

            try { status.TseFormFactor = Encoding.ASCII.GetString(b, 88, 4).TrimEnd('\0'); } catch { }
            try { status.MaxTimeSynchronizationDelay = ReadUInt32BE(b, 94); } catch { }
            try { status.MaxUpdateDelay = ReadUInt32BE(b, 98); } catch { }
            try { status.LastHeaderBlockIndex = ReadUInt32BE(b, 102); } catch { }

            try 
            {
                status.TsePublicKeyLength = ReadUInt16LE(b, 106); // IL shows ldc.i4.1 -> LittleEndian
                int len = status.TsePublicKeyLength;
                if (len > 100) len = 100;
                
                byte[] pubKey = b.Skip(107).Take(len).Reverse().ToArray();
                int skipZeros = 0;
                while (skipZeros < pubKey.Length && pubKey[skipZeros] == 0) skipZeros++;
                pubKey = pubKey.Skip(skipZeros).Reverse().ToArray();

                status.TsePublicKey = pubKey;
                status.TsePublicKeyString = BitConverter.ToString(pubKey).Replace("-", "").ToLower();
            } catch { }

            try { status.CspKeyReference = Encoding.ASCII.GetString(b, 212, 8).TrimEnd('\0'); } catch { }

            try 
            {
                byte[] serialBytes = b.Skip(256).Take(32).ToArray();
                status.TseSerial = BitConverter.ToString(serialBytes).Replace("-", "").ToLower();
            } catch { }

            try { status.TseDescription = Encoding.ASCII.GetString(b, 288, 128).TrimEnd('\0'); } catch { }

            // Handle uninitialized state (If time is uninitialized or firmware id is 0)
            if (status.CertificateExpirationDate == ulong.MaxValue || status.CertificateExpirationDate == 0)
                status.TseInitializationState = "Uninitialized";
            else
                status.TseInitializationState = "Initialized";
                
            propertyGrid.SelectedObject = status;
            lblStatus.Text = "Veriler okundu. Kopyalamak istediğiniz değere tıklayın.";
        }
    }

    static class Program
    {
        [System.Runtime.InteropServices.DllImport("kernel32.dll")]
        private static extern bool FreeConsole();

        [STAThread]
        static void Main(string[] args)
        {
            if (args.Length > 0)
            {
                RunCli(args);
                return;
            }

            // Argüman yoksa arayüzü başlat, konsol penceresini gizle
            FreeConsole();
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }

        static void RunCli(string[] args)
        {
            if (args.Contains("-all") || args.Contains("-h") || args.Contains("--help"))
            {
                Console.WriteLine("Kullanilabilir Komutlar:");
                Console.WriteLine("  -a    : Tum TSE bilgilerini (Versiyon, Serial, BIS, Tarih) okur ve ekrana yazdirir.");
                Console.WriteLine("  -v    : Sadece TSE Software Versiyonunu gosterir.");
                Console.WriteLine("  -s    : Sadece TSE Serial Numarasini gosterir.");
                Console.WriteLine("  -b    : Sadece BIS Kodunu gosterir.");
                Console.WriteLine("  -g    : Sadece Bitis (Gecerlilik) Tarihini gosterir.");
                Console.WriteLine("  -all  : Bu yardim menusunu gosterir.");
                return;
            }

            string foundPath = null;
            foreach (var drive in DriveInfo.GetDrives().Where(d => d.DriveType == DriveType.Removable))
            {
                if (drive.IsReady)
                {
                    string path = Path.Combine(drive.RootDirectory.FullName, "TSE_INFO.DAT");
                    if (File.Exists(path))
                    {
                        foundPath = path;
                        break;
                    }
                }
            }

            if (foundPath == null)
            {
                Console.WriteLine("Hata: USB suruculerde TSE_INFO.DAT bulunamadi.");
                return;
            }

            var status = ParseTseFileCli(foundPath);
            bool all = args.Contains("-a");

            if (all)
            {
                Console.WriteLine("--- TUM TSE BILGILERI ---");
                Console.WriteLine("Software Versiyon: " + status.TseSoftwareVersion);
                Console.WriteLine("TSE Serial      : " + status.TseSerial);
                Console.WriteLine("BIS Kodu        : " + status.TseDescription);
                Console.WriteLine("Bitis Tarihi    : " + status.CertificateExpirationDateTimeOffset);
                Console.WriteLine("-------------------------");
            }
            else
            {
                if (args.Contains("-v")) Console.WriteLine("TSE Software Versiyon: " + status.TseSoftwareVersion);
                if (args.Contains("-s")) Console.WriteLine("TSE Serial: " + status.TseSerial);
                if (args.Contains("-b")) Console.WriteLine("BIS Kodu: " + status.TseDescription);
                if (args.Contains("-g")) Console.WriteLine("Bitis Tarihi: " + status.CertificateExpirationDateTimeOffset);
            }
        }

        private static uint ReadUInt32BE(byte[] data, int offset) { return (uint)((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]); }
        private static ulong ReadUInt64BE(byte[] data, int offset) { return ((ulong)ReadUInt32BE(data, offset) << 32) | ReadUInt32BE(data, offset + 4); }
        private static ushort ReadUInt16BE(byte[] data, int offset) { return (ushort)((data[offset] << 8) | data[offset + 1]); }

        private static TseStatus ParseTseFileCli(string filePath)
        {
            byte[] b = new byte[512];
            using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                fs.Read(b, 0, 512);
            }

            TseStatus status = new TseStatus();
            try { status.TseDescription = Encoding.ASCII.GetString(b, 288, 128).TrimEnd('\0'); } catch { }
            try 
            {
                ulong exp = ReadUInt64BE(b, 64);
                status.CertificateExpirationDate = exp;
                long seconds = unchecked((long)exp);
                if (seconds > 253402300799L || seconds < -62135596800L) {
                    status.CertificateExpirationDateTimeOffset = "Invalid/Uninitialized";
                } else {
                    DateTime dt = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(seconds);
                    status.CertificateExpirationDateTimeOffset = dt.ToString("dd.MM.yyyy HH:mm:ss") + " +00:00";
                }
            } catch { }
            try 
            {
                ushort swMajor = ReadUInt16BE(b, 84);
                byte swMinor = b[86];
                byte swBuild = b[87];
                status.TseSoftwareVersion = swMajor + "." + swMinor + "." + swBuild;
            } catch { }
            try 
            {
                byte[] serialBytes = b.Skip(256).Take(32).ToArray();
                status.TseSerial = BitConverter.ToString(serialBytes).Replace("-", "").ToLower();
            } catch { }
            return status;
        }
    }
}
