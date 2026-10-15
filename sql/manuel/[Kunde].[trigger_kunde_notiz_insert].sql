select top 1 cKundenNr,cFirma, KundenKategorie, KundenGruppe from Kunde.lvKunde order by kKunde desc 
select top 1 cKundenNr + '-'+ cFirma  + '-'+ KundenKategorie from Kunde.lvKunde order by kKunde desc 
select top 10 cKundenNr,* from dbo.tkunde order by kKunde desc 