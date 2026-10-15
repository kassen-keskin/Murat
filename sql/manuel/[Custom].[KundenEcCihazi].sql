CREATE view [Custom].[KundenEcCihazi] as 
SELECT KEF248.kKunde,
	(KEF248.cWertVarchar + '-' + KEF252.cWertVarchar) as [EcCihazi]
FROM [Kunde].[tKundeEigenesFeld] 	as KEF248 with(nolock) 
INNER JOIN [Kunde].[tKundeEigenesFeld] 	as KEF252 with(nolock) on KEF252.kKunde = KEF248.kKunde
where 1 = 1
and KEF248.cWertVarchar is not null		
and KEF252.cWertVarchar is not null		
and KEF252.kAttribut = 252
and KEF248.kAttribut = 248
GO