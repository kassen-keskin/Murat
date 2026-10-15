ALTER VIEW [Custom].[KundenMaster]
AS
SELECT 
    M.kKunde,
    M.cKundenNr AS KundenNr,
    M.cFirma AS Firma,
    M.KundenKategorie,
    M.KundenGruppe,

    ISNULL(SK.KasaSayisi, 0) AS KasaSayisi,
    ISNULL(SS.SeriKodluKasaSayisi, 0) AS SeriKodluKasaSayisi,
    ISNULL(E.ElsterSayisi, 0) AS ElsterSayisi,
    B.BorcToplami,
    B.BorcTarihi,
    B.BorcTarihiGunSayisi

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

WHERE TRY_CAST(M.cKundenNr AS INT) > 999;