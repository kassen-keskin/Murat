SELECT *  FROM [Mandant_2].[Kunde].[tKundeEigenesFeld]

"Serial No: " + JTL_DirectQuery("SELECT KEF.cWertVarchar FROM [Kunde].[tKundeEigenesFeld] as KEF LEFT OUTER JOIN [dbo].[tAttributSprache] as ATS ON ATS.kAttribut = KEF.kAttribut LEFT OUTER JOIN Kunde.lvKunde as K ON K.kKunde = KEF.kKunde where ATS.kAttribut=184 and K.cKundenNr = '"+Report.Address.CustomerNumber+"'")