/*
DISABLE TRIGGER tgr_tKunde_INSUPDEL ON dbo.tKunde;
ENABLE  TRIGGER tgr_tKunde_INSUPDEL ON dbo.tKunde;
*/

    select 
        K.cKundenNr as Kundennummer,         
        k.cFirma as K_Firma,
        RP.cArtNr as Artikelnummer,
        RP.cName as [Bezeichnung (Position)],
        K.KundenKategorie,
        K.kKundenKategorie,
        TK.kKundenKategorie

    --update TK set TK.kKundenKategorie = 1 --Olympia 941

    from Rechnung.tRechnungPosition	as RP with(nolock) 
    INNER JOIN Rechnung.tRechnung			as RC with(nolock) on RC.kRechnung = RP.kRechnung
    INNER JOIN Kunde.lvKunde		as K  with(nolock) on RC.kKunde = k.kKunde
    INNER JOIN dbo.tkunde as TK with(nolock) on TK.kKunde = K.kKunde
    where 1=1
    and K.KundenKategorie is null
    --eazybusiness
    and K.kKunde in (  
        select 
            K.kKunde
            /*
            K.cKundenNr as Kundennummer,         
            k.cFirma as K_Firma,
            RP.cArtNr as Artikelnummer,
            RP.cName as [Bezeichnung (Position)],
            K.KundenKategorie,
            K.kKundenKategorie,
            TK.kKundenKategorie
            */
        from eazybusiness.Rechnung.tRechnungPosition	as RP with(nolock) 
        INNER JOIN eazybusiness.Rechnung.tRechnung			as RC with(nolock) on RC.kRechnung = RP.kRechnung
        INNER JOIN eazybusiness.Kunde.lvKunde		as K  with(nolock) on RC.kKunde = k.kKunde
        INNER JOIN eazybusiness.dbo.tkunde as TK with(nolock) on TK.kKunde = K.kKunde
        where 1=1
        --and TK.kKundenKategorie = 1
        --and RP.cName like '%INViCTUS%'
    )


