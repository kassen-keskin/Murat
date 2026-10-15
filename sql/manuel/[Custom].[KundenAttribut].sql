ALTER view [Custom].[KundenAttribut] as 
SELECT 
		case ATS.kAttribut
			when 209 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Registriercode
			when 210 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Freischaltcode
			when 238 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Drucker Seriennummer:
			when 206 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Kassen Sereinnummer:			
			when 223 then A.cGruppeName + ' ' + ATS.cName + ' = ' + CONVERT(CHAR(10), KEF.dWertDateTime, 105)  --Backup
			when 228 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Version
			when 229 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Lizenz Nr.
			when 232 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Informationen
			when 241 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --ELSTER Not
			when 240 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Kacinci Elster
			when 243 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Kacinci TSE
			when 244 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --TSE Serino
			when 235 then A.cGruppeName + ' ' + ATS.cName + '  ' + case KEF.nWertInt when 1 then 'var' else 'yok' end --Elster
			when 236 then A.cGruppeName + ' ' + ATS.cName + '  ' + case KEF.nWertInt when 1 then 'var' else 'yok' end --Dashboard
			when 242 then A.cGruppeName + ' ' + ATS.cName + '  ' + case KEF.nWertInt when 1 then 'evet' else 'hayir' end --TSE
			when 245 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --Servis Durumu
			when 246 then A.cGruppeName + ' ' + ATS.cName + ' = ' + CONVERT(CHAR(10), KEF.dWertDateTime, 105)  --TSE Bitis
			when 247 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --TSE BSI			
			when 239 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --EC-seri
			when 248 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --EC-saglayici
			when 249 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --EC-ID
			when 250 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --EC-IP
			when 251 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --EC-pass
			when 252 then A.cGruppeName + ' ' + ATS.cName + ' = ' + KEF.cWertVarchar --EC-model
		else ATS.cName
		end 
		 + CHAR(13) + CHAR(10)
		as Detay

		,K.kKunde
		,A.cGruppeName
		,ATS.kAttribut
		FROM [Kunde].[tKundeEigenesFeld] 	as KEF with(nolock)
		INNER JOIN [dbo].[tAttributSprache] as ATS with(nolock) ON ATS.kAttribut = KEF.kAttribut
		INNER JOIN [Kunde].[lvKunde] 		as K   with(nolock) ON K.kKunde = KEF.kKunde
		INNER JOIN [dbo].[tAttribut]        as A   with(nolock) on ATS.kAttribut = A.kAttribut
		where 1=1 
		--and k.cKundenNr = 1509	
GO