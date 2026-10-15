select * from departments where group_id in (1)
select * from article where department_id in (select id from departments where group_id in (1)) order by text1
--select *, (total - (total/1.19)) as hesap19 from arevdb where categoryId in (4,5,6,8,12)
--select *, (total - (total/1.19)) as hesap19  from arevd where categoryId in (4,5,6,8,12)
--select * from sqlite_sequence order by seq desc
select * from gobd where field_9  in (select text1 from article where department_id in (select id from departments where group_id in (1))) and ifNULL(field_15 ,'')  and field_15 = '7.0'
