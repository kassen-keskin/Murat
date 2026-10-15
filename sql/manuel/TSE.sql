SELECT 
case ATS.kAttribut
	when 209 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 210 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 211 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 206 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 214 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 216 then ATS.cName + ' = ' + CONVERT(CHAR(10), KEF.dWertDateTime, 105)
	when 218 then ATS.cName + '  ' + case KEF.nWertInt when 1 then 'var' else 'yok' end
	when 219 then ATS.cName + '  ' + case KEF.nWertInt when 1 then 'var' else 'yok' end
	when 220 then ATS.cName + '  ' + case KEF.nWertInt when 1 then 'var' else 'yok' end
	when 221 then ATS.cName + '  ' + case KEF.nWertInt when 1 then 'var' else 'yok' end
	when 223 then ATS.cName + ' = ' + CONVERT(CHAR(10), KEF.dWertDateTime, 105)
	when 228 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 229 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 231 then ATS.cName + ' = ' + KEF.cWertVarchar 
	when 232 then ATS.cName + ' = ' + KEF.cWertVarchar 
else ATS.cName
end as Detay

FROM [Kunde].[tKundeEigenesFeld] 	as KEF
INNER JOIN [dbo].[tAttributSprache] as ATS ON ATS.kAttribut = KEF.kAttribut
INNER JOIN [Kunde].[lvKunde] 		as K ON K.kKunde = KEF.kKunde
where 1=1
and K.kKunde = 20
order by 
	K.cKundenNr, 
	ATS.kAttribut