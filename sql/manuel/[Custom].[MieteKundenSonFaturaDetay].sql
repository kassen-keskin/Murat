ALTER VIEW [Custom].[MieteKundenSonFaturaDetay] as
    select 
        K.cKundenNr as Kundennummer, 
        K.KassenKunde,	
        k.cFirma as K_Firma,
        dbo.GetNextAuftragsNr(DENSE_RANK() OVER (ORDER BY K.cKundenNr)) as Auftragsnummer,	
        --RC.cZahlungsart as [Zahlungsart Auftrag],
        case K.KassenKunde when 1 then 'Bank' else 'Rechnung' end as [Zahlungsart Auftrag],
        CONVERT(VARCHAR(10), GETDATE(), 104) as Auftragsdatum,
        RP.cArtNr as Artikelnummer,
        RP.cName as [Bezeichnung (Position)],
        1 as Menge,
        19 as [USt. in %],
        FORMAT(RP.fVkBruttoGesamt, 'N2', 'de-DE') as [Brutto-VK]
    from [Custom].[MieteKundenSonFatura] as R with(nolock) 
    INNER JOIN Rechnung.tRechnungPosition	as RP with(nolock) on RP.kRechnung = R.kRechnungSon
    INNER JOIN Rechnung.tRechnung			as RC with(nolock) on RC.kRechnung = R.kRechnungSon
    INNER JOIN Kunde.lvKunde		as K  with(nolock) on R.kKunde = k.kKunde
    where 1=1
GO


