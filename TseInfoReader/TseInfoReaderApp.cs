using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Drawing;
using System.ComponentModel;
using System.Reflection;

namespace TseInfoReader
{
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

    public class MainForm : Form
    {
        private PropertyGrid propertyGrid;
        private Button btnScan;
        private Label lblStatus;
        private Label lblDriveInfo;

        public MainForm()
        {
            this.Text = "TSE Info Reader";
            this.Size = new Size(800, 700);
            this.StartPosition = FormStartPosition.CenterScreen;

            TableLayoutPanel layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.RowCount = 3;
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 50));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            layout.ColumnCount = 1;

            FlowLayoutPanel topPanel = new FlowLayoutPanel();
            topPanel.Dock = DockStyle.Fill;
            topPanel.WrapContents = false;

            btnScan = new Button();
            btnScan.Text = "Otomatik Tara (USB'leri Bul)";
            btnScan.Size = new Size(200, 35);
            btnScan.Margin = new Padding(3, 8, 3, 3);
            btnScan.Click += BtnScan_Click;

            lblDriveInfo = new Label();
            lblDriveInfo.Text = "Okunan Sürücü: -";
            lblDriveInfo.AutoSize = true;
            lblDriveInfo.Margin = new Padding(15, 17, 3, 3);
            lblDriveInfo.Font = new Font(lblDriveInfo.Font, FontStyle.Bold);

            topPanel.Controls.Add(btnScan);
            topPanel.Controls.Add(lblDriveInfo);

            propertyGrid = new PropertyGrid();
            propertyGrid.Dock = DockStyle.Fill;
            propertyGrid.PropertySort = PropertySort.Categorized;
            propertyGrid.ToolbarVisible = false;
            propertyGrid.SelectedGridItemChanged += PropertyGrid_SelectedGridItemChanged;

            lblStatus = new Label();
            lblStatus.Dock = DockStyle.Fill;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            lblStatus.Text = "Hazır. Lütfen tara butonuna basın. (Üzerine tıkladığınız değerler otomatik kopyalanır)";

            layout.Controls.Add(topPanel, 0, 0);
            layout.Controls.Add(propertyGrid, 0, 1);
            layout.Controls.Add(lblStatus, 0, 2);

            this.Controls.Add(layout);
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
                    lblDriveInfo.Text = "Okunan Sürücü: " + Path.GetPathRoot(foundPath);
                    lblStatus.Text = string.Format("Bulundu: {0}. Veriler okunuyor...", foundPath);
                    ParseTseFile(foundPath);
                }
                else
                {
                    lblDriveInfo.Text = "Okunan Sürücü: Bulunamadı";
                    lblStatus.Text = "Hiçbir USB sürücüde TSE_INFO.DAT dosyası bulunamadı!";
                    propertyGrid.SelectedObject = null;
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
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
