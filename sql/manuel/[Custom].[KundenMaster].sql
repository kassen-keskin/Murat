ALTER VIEW [Custom].[KundenMaster] AS
SELECT 
    M.kKunde,
    M.cKundenNr AS KundenNr,
    M.cFirma AS Firma,
    M.cVorname + ' ' + M.cName as InhabeName,
    M.KundenKategorie,
    M.KundenGruppe,

    ISNULL(SK.KasaSayisi, 0) AS KasaSayisi,
    ISNULL(SS.SeriKodluKasaSayisi, 0) AS SeriKodluKasaSayisi,
    ISNULL(E.ElsterSayisi, 0) AS ElsterSayisi,
    B.BorcToplami,
    B.BorcTarihi,
    B.BorcTarihiGunSayisi,
    A.AuftragSayisi,
    N.NotSayisi,
    M.Gesperrt,
    (
		select top 1 TK.TamKontrolTarihi
		from [Custom].[KundenTamKontrolTarihi] as TK with(nolock)
		where TK.kKunde = M.kKunde
		order by TK.TamKontrolTarihi desc
	) as TamKontrolTarihi,

	(	select 
			case 
			when KA.Detay like '%1.Teklif gönderildi%'	then 1
			when KA.Detay like '%2.Faturasi Ödendi%'	then 2
			else 0
			end
		from [Custom].[KundenAttribut] as KA with(nolock) 
		where KA.kAttribut = 245  --Servis Durumu
		and KA.kKunde = M.kKunde
    ) as Servis,

    (
		select top 1 TB.TSEBitisTarihi
		from [Custom].[KundenTSEBitisTarihi] as TB with(nolock)
		where TB.kKunde = M.kKunde
		--order by TB.TSEBitisTarihi desc
	) as TSEBitisTarihi,

    (
		select top 1 EC.EcCihazi
		from [Custom].[KundenEcCihazi] as EC with(nolock)
		where EC.kKunde = M.kKunde

	) as EcCihazi    


FROM Kunde.lvKunde AS M WITH (NOLOCK)

LEFT JOIN (
    SELECT kKunde, COUNT(ArtName) AS KasaSayisi
    FROM [Custom].[SatilanKasalar] WITH (NOLOCK)
    GROUP BY kKunde
) SK ON SK.kKunde = M.kKunde

LEFT JOIN (
    SELECT kKunde, COUNT(ArtikelSeriNo) AS SeriKodluKasaSayisi
    FROM [Custom].[SatilanKasalarSeriKodlu] WITH (NOLOCK)
    GROUP BY kKunde
) SS ON SS.kKunde = M.kKunde

LEFT JOIN (
    SELECT kKunde, MAX(ISNULL(ElsterSayisi,0)) AS ElsterSayisi
    FROM [Custom].[ElsteriYapilanlar] WITH (NOLOCK)
    GROUP BY kKunde
) E ON E.kKunde = M.kKunde

LEFT JOIN (
    SELECT 
        kKunde,
        MAX(BorcToplami) AS BorcToplami,
        MAX(BorcTarihi) AS BorcTarihi,
        MAX(BorcTarihiGunSayisi) AS BorcTarihiGunSayisi
    FROM [Custom].[Borclar] WITH (NOLOCK)
    GROUP BY kKunde
) B ON B.kKunde = M.kKunde

LEFT JOIN (
    SELECT kKunde, COUNT(cAuftragsNr) AS AuftragSayisi
    FROM Verkauf.vAuftrag WITH (NOLOCK)
    GROUP BY kKunde
) A ON A.kKunde = M.kKunde

LEFT JOIN (
    SELECT kKunde, COUNT(cNotiz) AS NotSayisi
    FROM [Kunde].[tNotiz] WITH (NOLOCK)
    GROUP BY kKunde
) N ON N.kKunde = M.kKunde

WHERE TRY_CAST(M.cKundenNr AS INT) > 999
--order by M.kKunde
GO


