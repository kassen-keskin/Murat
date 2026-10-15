ALTER view [Custom].[Kunde] as
select 
    K.kKunde, --KundeID
	K.cKundenNr as KundenNr,
	KA.cFirma as Firma,
	KA.cAnrede as Anrede,
	KA.cVorname + ' ' + KA.cName as InhabeName,	
	KA.cVorname,
	KA.cName, 
	KA.cTel as Tel,
	KA.cMobil as Mobil,
	KA.cMail as Mail,
	K.cWWW as Web,
	KA.cStrasse as FirmaAdress,

    LEFT(KA.cStrasse, 
        (SELECT MAX(pos) FROM (VALUES 
            (CASE WHEN CHARINDEX(' ', REVERSE(KA.cStrasse)) > 0 
                  THEN LEN(KA.cStrasse) - CHARINDEX(' ', REVERSE(KA.cStrasse)) ELSE 0 END),
            (CASE WHEN CHARINDEX('.', REVERSE(KA.cStrasse)) > 0 
                  THEN LEN(KA.cStrasse) - CHARINDEX('.', REVERSE(KA.cStrasse)) ELSE 0 END)
        ) AS t(pos))
    ) AS FirmaStrasse,

   CASE
        WHEN CHARINDEX('.', REVERSE(KA.cStrasse)) > 0
         AND CHARINDEX('.', REVERSE(KA.cStrasse)) <= ISNULL(NULLIF(CHARINDEX(' ', REVERSE(KA.cStrasse)), 0), 9999)
        THEN REPLACE(
                RIGHT(KA.cStrasse, LEN(KA.cStrasse) - 
                    (SELECT MAX(pos) FROM (VALUES 
                        (CASE WHEN CHARINDEX(' ', REVERSE(KA.cStrasse)) > 0 
                              THEN LEN(KA.cStrasse) - CHARINDEX(' ', REVERSE(KA.cStrasse)) ELSE 0 END),
                        (CASE WHEN CHARINDEX('.', REVERSE(KA.cStrasse)) > 0 
                              THEN LEN(KA.cStrasse) - CHARINDEX('.', REVERSE(KA.cStrasse)) ELSE 0 END)
                    ) AS t(pos))
                ), '.', '')
        ELSE
                RIGHT(KA.cStrasse, LEN(KA.cStrasse) - 
                    (SELECT MAX(pos) FROM (VALUES 
                        (CASE WHEN CHARINDEX(' ', REVERSE(KA.cStrasse)) > 0 
                              THEN LEN(KA.cStrasse) - CHARINDEX(' ', REVERSE(KA.cStrasse)) ELSE 0 END),
                        (CASE WHEN CHARINDEX('.', REVERSE(KA.cStrasse)) > 0 
                              THEN LEN(KA.cStrasse) - CHARINDEX('.', REVERSE(KA.cStrasse)) ELSE 0 END)
                    ) AS t(pos))
                )
    END AS FirmaNo,

	KA.cPLZ as PLZ,
	KA.cOrt as Ort,
	KA.cUSTID as IDNr,
	K.cSteuerNr as SteuerNr,
	K.cGeburtstag as Geburtstag,
	PA.cStrasse as PrivatAdress,
  
    
    LEFT(PA.cStrasse, 
        (SELECT MAX(pos) FROM (VALUES 
            (CASE WHEN CHARINDEX(' ', REVERSE(PA.cStrasse)) > 0 
                  THEN LEN(PA.cStrasse) - CHARINDEX(' ', REVERSE(PA.cStrasse)) ELSE 0 END),
            (CASE WHEN CHARINDEX('.', REVERSE(PA.cStrasse)) > 0 
                  THEN LEN(PA.cStrasse) - CHARINDEX('.', REVERSE(PA.cStrasse)) ELSE 0 END)
        ) AS t(pos))
    ) as PrivatStrasse,


   CASE
        WHEN CHARINDEX('.', REVERSE(PA.cStrasse)) > 0
         AND CHARINDEX('.', REVERSE(PA.cStrasse)) <= ISNULL(NULLIF(CHARINDEX(' ', REVERSE(PA.cStrasse)), 0), 9999)
        THEN REPLACE(
                RIGHT(PA.cStrasse, LEN(PA.cStrasse) - 
                    (SELECT MAX(pos) FROM (VALUES 
                        (CASE WHEN CHARINDEX(' ', REVERSE(PA.cStrasse)) > 0 
                              THEN LEN(PA.cStrasse) - CHARINDEX(' ', REVERSE(PA.cStrasse)) ELSE 0 END),
                        (CASE WHEN CHARINDEX('.', REVERSE(PA.cStrasse)) > 0 
                              THEN LEN(PA.cStrasse) - CHARINDEX('.', REVERSE(PA.cStrasse)) ELSE 0 END)
                    ) AS t(pos))
                ), '.', '')
        ELSE
                RIGHT(PA.cStrasse, LEN(PA.cStrasse) - 
                    (SELECT MAX(pos) FROM (VALUES 
                        (CASE WHEN CHARINDEX(' ', REVERSE(PA.cStrasse)) > 0 
                              THEN LEN(PA.cStrasse) - CHARINDEX(' ', REVERSE(PA.cStrasse)) ELSE 0 END),
                        (CASE WHEN CHARINDEX('.', REVERSE(PA.cStrasse)) > 0 
                              THEN LEN(PA.cStrasse) - CHARINDEX('.', REVERSE(PA.cStrasse)) ELSE 0 END)
                    ) AS t(pos))
                )
    END AS PrivatNo,

    PA.cPLZ as PrivatPLZ,
    PA.cOrt as PrivatOrt,    
    ISNULL(KEF206.cWertVarchar,'') as [KassenNo],
    ISNULL(KEF244.cWertVarchar,'') as [TSENo],
    KK.cName as KundenKategorie,    
    FORMAT(CAST(ISNULL(KEF246.dWertDateTime,'') AS DATETIME), 'dd.MM.yyyy') as [TSEBitisTarihi],
    ISNULL(RIGHT(KEF247.cWertVarchar, 9),'') as [TSEBIS],
    (KEF248.cWertVarchar + '-' + KEF252.cWertVarchar) as [EcCihazi]

FROM dbo.tkunde as K with(nolock)
INNER JOIN dbo.tAdresse as KA with(nolock) ON (KA.kKunde = K.kKunde) AND (KA.nStandard = 1) AND (KA.nTyp = 1)
LEFT OUTER JOIN dbo.tKundenKategorie as KK with(nolock) on KK.kKundenKategorie = K.kKundenKategorie
LEFT OUTER JOIN [Custom].[PrivatAdresse] as PA  with(nolock) on PA.kKunde = K.kKunde
LEFT OUTER JOIN [Kunde].[tKundeEigenesFeld] 	as KEF206 with(nolock) on KEF206.kKunde = K.kKunde and KEF206.kAttribut = 206
LEFT OUTER JOIN [Kunde].[tKundeEigenesFeld] 	as KEF244 with(nolock) on KEF244.kKunde = K.kKunde and KEF244.kAttribut = 244
LEFT OUTER JOIN [Kunde].[tKundeEigenesFeld] 	as KEF246 with(nolock) on KEF246.kKunde = K.kKunde and KEF246.kAttribut = 246
LEFT OUTER JOIN [Kunde].[tKundeEigenesFeld] 	as KEF247 with(nolock) on KEF247.kKunde = K.kKunde and KEF247.kAttribut = 247
LEFT OUTER JOIN [Kunde].[tKundeEigenesFeld] 	as KEF248 with(nolock) on KEF248.kKunde = K.kKunde and KEF248.kAttribut = 248
LEFT OUTER JOIN [Kunde].[tKundeEigenesFeld] 	as KEF252 with(nolock) on KEF252.kKunde = K.kKunde and KEF252.kAttribut = 252
where 1=1
--and K.cKundenNr = '2932'
--order by kKunde desc
GO


