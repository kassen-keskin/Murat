SELECT  * FROM dbo.Kunde_Trigger_Log ORDER BY LogId DESC;

/*
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Kunde_Trigger_Log]') AND type in (N'U'))
DROP TABLE [dbo].[Kunde_Trigger_Log]
GO

CREATE TABLE dbo.Kunde_Trigger_Log (
    LogId INT IDENTITY(1,1) PRIMARY KEY,
    LogDate DATETIME DEFAULT GETDATE(),
    ActionType NVARCHAR(20),
    kKunde INT,
    cKundenNr NVARCHAR(100),
    FolderName NVARCHAR(400),
    CmdOutput NVARCHAR(MAX)
);

CREATE OR ALTER TRIGGER trg_tkunde_CreateCustomerFolders
ON dbo.tkunde
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @kKunde INT;
    DECLARE @cKundenNr NVARCHAR(100);
    DECLARE @FolderName NVARCHAR(400);
    DECLARE @BasePath NVARCHAR(500) = '\\fileserver\Ortak_Alan\2026\kunden\Nolular';
    
    -- Samba Kimlik Bilgileri
    DECLARE @SambaUser NVARCHAR(100) = 'hasan';
    DECLARE @SambaPass NVARCHAR(100) = 'kassenberlin';

    DECLARE @Cmd NVARCHAR(4000);
    DECLARE @CmdOutputText NVARCHAR(MAX);

    CREATE TABLE #CmdResult (OutputLine NVARCHAR(1000));

    DECLARE cur_Kunde CURSOR LOCAL FAST_FORWARD FOR
        SELECT i.kKunde, i.cKundenNr
        FROM inserted i
        WHERE i.cKundenNr IS NOT NULL AND LTRIM(RTRIM(i.cKundenNr)) <> '';

    OPEN cur_Kunde;
    FETCH NEXT FROM cur_Kunde INTO @kKunde, @cKundenNr;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- 1. KONTROL: Bu müşteri için daha önce başarılı kayıt varsa sonraki UPDATE'lerde atla
        IF EXISTS (
            SELECT 1 
            FROM dbo.Kunde_Trigger_Log 
            WHERE kKunde = @kKunde 
              AND (CmdOutput LIKE '%erfolgreich%' OR CmdOutput = 'BASARILI')
        )
        BEGIN
            FETCH NEXT FROM cur_Kunde INTO @kKunde, @cKundenNr;
            CONTINUE;
        END

        SET @FolderName = NULL;
        SET @CmdOutputText = '';

        -- 2. lvKunde view'ından klasör adını çekiyoruz
        SELECT TOP 1
            @FolderName = (CASE kKundenGruppe 
                                WHEN 3 THEN 'M-' 
                                WHEN 4 THEN 'S-' 
                                WHEN 5 THEN 'S-' 
                                ELSE '' 
                           END)
                          + ISNULL(cKundenNr, '') + '-' 
                          + ISNULL(cFirma, '')    + '-' 
                          + ISNULL(KundenKategorie, '')
        FROM Kunde.lvKunde
        WHERE cKundenNr = @cKundenNr;

        -- Klasör adı doluysa işlemi başlat
        IF @FolderName IS NOT NULL AND LTRIM(RTRIM(@FolderName)) <> ''
        BEGIN
            -- Yasaklı karakterleri temizle
            SET @FolderName = REPLACE(@FolderName, '\', '-');
            SET @FolderName = REPLACE(@FolderName, '/', '-');
            SET @FolderName = REPLACE(@FolderName, ':', '-');
            SET @FolderName = REPLACE(@FolderName, '*', '');
            SET @FolderName = REPLACE(@FolderName, '?', '');
            SET @FolderName = REPLACE(@FolderName, '"', '');
            SET @FolderName = REPLACE(@FolderName, '<', '');
            SET @FolderName = REPLACE(@FolderName, '>', '');
            SET @FolderName = REPLACE(@FolderName, '|', '');

            -- 3. Temiz ve hatasız CMD komutu (iç içe tırnak/parantez olmadan)
            SET @Cmd = 'net use \\fileserver\Ortak_Alan ' + @SambaPass + ' /user:' + @SambaUser + ' & '
                + 'if not exist "' + @BasePath + '\' + @FolderName + '" '
                + 'mkdir '
                + '"' + @BasePath + '\' + @FolderName + '\Artikel" '
                + '"' + @BasePath + '\' + @FolderName + '\Backup" '
                + '"' + @BasePath + '\' + @FolderName + '\Ec-Gerät" '
                + '"' + @BasePath + '\' + @FolderName + '\Elster" '
                + '"' + @BasePath + '\' + @FolderName + '\Lastschrift" '
                + '"' + @BasePath + '\' + @FolderName + '\Mietvertrag" '
                + '"' + @BasePath + '\' + @FolderName + '\Program" '
                + '"' + @BasePath + '\' + @FolderName + '\RMA"';

            DELETE FROM #CmdResult;
            INSERT INTO #CmdResult (OutputLine)
            EXEC xp_cmdshell @Cmd;

            SELECT @CmdOutputText = STRING_AGG(OutputLine, ' ') 
            FROM #CmdResult 
            WHERE OutputLine IS NOT NULL;

            -- Log tablosuna kaydet
            INSERT INTO dbo.Kunde_Trigger_Log (ActionType, kKunde, cKundenNr, FolderName, CmdOutput)
            VALUES (
                CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END, 
                @kKunde, 
                @cKundenNr, 
                @FolderName,
                ISNULL(@CmdOutputText, 'BASARILI')
            );
        END

        FETCH NEXT FROM cur_Kunde INTO @kKunde, @cKundenNr;
    END

    CLOSE cur_Kunde;
    DEALLOCATE cur_Kunde;
    DROP TABLE #CmdResult;
END;
GO

*/