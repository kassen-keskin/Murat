CREATE view [Custom].[KundenTSEBitisTarihi] as 
SELECT KEF.kKunde,
		case ATS.kAttribut
			when 246 then  CONVERT(CHAR(10), KEF.dWertDateTime, 105)  --Backup
		else NULL
		end 
		as TSEBitisTarihi
FROM [Kunde].[tKundeEigenesFeld] 	as KEF with(nolock)
INNER JOIN [dbo].[tAttributSprache] as ATS with(nolock) ON ATS.kAttribut = KEF.kAttribut
where KEF.dWertDateTime is not null
and ATS.kAttribut = 246
GO