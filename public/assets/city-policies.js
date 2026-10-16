// Field-level sources: unverified numbers stay null, never copied from a neighbour.
export const regions={
 '直辖市':['上海','北京','天津'],
 '江苏':['南京','无锡','徐州','常州','苏州','南通','连云港','淮安','盐城','扬州','镇江','泰州','宿迁'],
 '浙江':['杭州','宁波','温州','嘉兴','湖州','绍兴','金华','衢州','舟山','台州','丽水'],
 '河北':['石家庄','唐山','秦皇岛','邯郸','邢台','保定','张家口','承德','沧州','廊坊','衡水','雄安新区','定州','辛集'],
 '大湾区内地':['广州','深圳','珠海','佛山','惠州','东莞','中山','江门','肇庆'],
};
export const cityOptions=Object.entries(regions).flatMap(([region,names])=>names.map(name=>[name,`${name} · ${region}`]));
const source=(label,url)=>({label,url});
const jsBase=source('江苏人社：2026年度正式基数5025—25127（追溯全年）','https://jshrss.jiangsu.gov.cn/art/2026/10/8/art_77277_11838872.html');
const jsRates=source('江苏税务：2026吴江申报与养老、失业费率','https://jiangsu.chinatax.gov.cn/art/2026/4/14/art_21737_921.html');
const zjRates=source('浙江税务：2025年起单位养老16%','https://zhejiang.chinatax.gov.cn/art/2025/1/21/art_22104_630903.html');
const gdRates=source('广东税务：2025年起单位养老16%','https://guangdong.chinatax.gov.cn/gdsw/zqsw_tzgg/2024-12/30/content_018b45af0f1947eb81918886a2d9dfd2.shtml');
const gdBase=source('广东：2025年7月养老基数（仅历史）','https://www.shantou.gov.cn/stsshbxjj/zwgk/content/post_2508025.html');
const records={};
const record=(names,values,src,from='2026-07',to='2026-12',status='已核验')=>{for(const city of names){records[city]??=[];records[city].push({values,source:src,from,to,status});}};
// Su Ren She Fa [2026] 30 replaces the provisional figures retrospectively for 2026.
record(regions.江苏,{pensionMin:5025,pensionMax:25127,medicalMin:5025,medicalMax:25127,unemploymentMin:5025,unemploymentMax:25127,injuryMin:5025,injuryMax:25127},jsBase,'2026-01','2026-12');
record(regions.江苏,{pensionP:8,pensionC:16,unemploymentP:.5,unemploymentC:.5},jsRates);
record(regions.浙江,{pensionC:16},zjRates);
record(regions.浙江,{pensionP:8},source('浙江税务：个人养老8%','https://zhejiang.chinatax.gov.cn/art/2022/3/17/art_13314_539906.html'));
record(regions.浙江,{pensionMin:4986,pensionMax:25299},source('浙江2025基数（仅历史参考，不自动套用2026）','https://zhejiang.chinatax.gov.cn/art/2025/12/11/art_13314_645797.html'),'2025-01','2025-12');
const zjBase=source('浙江人社：2026正式基数5122—25611（全年）','https://rlsbt.zj.gov.cn/col/col1229101513/art/2026/art_e8b496ab59834390884b8d375cff1651.html');
record(regions.浙江,{pensionMin:5122,pensionMax:25611,medicalMin:5122,medicalMax:25611,unemploymentMin:5122,unemploymentMax:25611,injuryMin:5122,injuryMax:25611},zjBase,'2026-01','2026-12');
const gd2026=source('广东税务：粤人社发〔2026〕24号，企业养老分期调整','https://guangdong.chinatax.gov.cn/gdsw/ssfggds/2026-10/08/content_b40dcb7bf605411fbb12e0f81281dc6b.shtml');
record(regions['大湾区内地'],{pensionMin:5510},gd2026,'2026-01','2026-06');
record(regions['大湾区内地'],{pensionMin:5521,pensionMax:27603},gd2026,'2026-07','2026-12');
const hbBase=source('河北人社：冀人社字〔2026〕57号，养老失业工伤基数4076—20382','https://rst.hebei.gov.cn/pageWarp?isId=1784107904415nkh&id=1');
record(regions.河北,{pensionMin:4076,pensionMax:20382,unemploymentMin:4076,unemploymentMax:20382,injuryMin:4076,injuryMax:20382},hbBase,'2026-01','2026-12');
record(regions['大湾区内地'],{pensionC:16},gdRates);
record(regions['大湾区内地'],{pensionMin:4775,pensionMax:27549},gdBase,'2025-07','2025-12');
record(['广州'],{pensionMin:5510,pensionMax:27549},gdBase,'2025-07','2025-12');
record(['上海'],{pensionMin:7546,pensionMax:37731,medicalMin:7546,medicalMax:37731,unemploymentMin:7546,unemploymentMax:37731,injuryMin:7546,injuryMax:37731},source('上海人社：2026年7月起社保基数','https://rsj.sh.gov.cn/tdjjf_17554/20260824/t0035_1443297.html'));
record(['上海'],{pensionP:8,pensionC:16},source('上海发改委：养老费率','https://fgw.sh.gov.cn/ys-laogong-2.3.1.2/index.html'));
record(['上海'],{medicalP:2,medicalC:8.5,medicalExtraC:.5,birthC:0,fixedP:0,fixedC:0},source('上海医保2026阶段性费率（基本含生育）','https://www.shanghai.gov.cn/gwk/search/content/921e047144694b61b6df8ca0c5ef2cfc'),'2026-03','2027-02');
record(['上海'],{unemploymentP:.5},source('上海2026职工个人失业费率','https://www.shanghai.gov.cn/nw17239/20260913/37398bbb63ad4fffa64e0b9deb0f6afc.html'));
record(['上海'],{fundMin:2740,fundMax:37731,fundRateMax:7},source('上海公积金：沪公积金管委会〔2026〕3号正式年度通知','https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html'),'2026-07','2027-06');
record(['北京'],{pensionMin:7270,pensionMax:36348,medicalMin:7270,medicalMax:36348,unemploymentMin:7270,unemploymentMax:36348,injuryMin:7270,injuryMax:36348},source('北京2026五险基数','https://rsj.beijing.gov.cn/xxgk/2024zcjd/202608/t20260821_4831476.html'));
record(['北京'],{pensionP:8,pensionC:16,unemploymentP:.5,unemploymentC:.5,medicalP:2,medicalC:9.8,medicalExtraC:0,birthC:0,fixedP:3,fixedC:0},source('北京市商务局2026投资指南：职工缴费表','https://sw.beijing.gov.cn/zwxx/swxx/202605/P020260512520283489932.pdf'));
record(['北京'],{fundMin:2540,fundMax:36348,fundRateMax:12,fundRounding:0},source('北京2026公积金年度通知','https://gjj.beijing.gov.cn/web/zwgk61/2024zcwj/436433461/744103382/index.html'),'2026-07','2027-06');
record(['天津'],{medicalP:2,medicalC:10.5,medicalExtraC:0,birthC:0},source('天津2026职工医保通知：普通单位，含生育','https://www.tj.gov.cn/zwgk/szfgb/xqk/2026/12/bmgfxwj/202607/t20260703_7329233.html'),'2026-03','2026-12');
record(['苏州'],{medicalP:2,medicalC:7,birthC:.8,medicalExtraC:0,fixedP:5,fixedC:0},jsRates);
record(['杭州'],{medicalP:2,medicalC:9.5,birthC:0,medicalExtraC:0},source('杭州职工医保统一费率，含生育','https://zfgb.hangzhou.gov.cn/11/105220253/t116220253054/518112.shtml'));
record(['深圳'],{medicalMin:6727,medicalMax:33633,medicalP:2,medicalC:6,medicalExtraC:0},source('深圳医保2026缴费通知：默认一档','https://hsa.sz.gov.cn/xwzx/tzgg/content/post_12567884.html'),'2026-01','2026-12');
record(['深圳'],{birthC:.5},source('深圳医疗保障办法：生育按医保基数0.5%','https://hsa.sz.gov.cn/ztzl/szsylbzbf/content/post_10875761.html'));
record(['天津'],{pensionMin:5180,pensionMax:25902,medicalMin:5180,medicalMax:25902,unemploymentMin:5180,unemploymentMax:25902,injuryMin:5180,injuryMax:25902},source('天津人社等三部门2026标准：9月1日起执行','https://www.tjftz.gov.cn/contents/6256/382302.html'),'2026-09','2026-12');
// Distinct insurance schemes must be selected explicitly; a district is not a city-wide default.
export const medicalPlans={
 '深圳':[['sz1','深圳 · 职工医保一档'],['sz2','深圳 · 职工医保二档']],
 '苏州':[['wj','苏州 · 吴江普通企业职工'],['sip','苏州 · 工业园区普通企业职工'],['other','苏州 · 其他区域（参数尚未接入）']],
 '东莞':[['dgSingle','东莞 · 单建统筹'],['dgAccount','东莞 · 统账结合（有个人账户）'],['dgNoAccount','东莞 · 统账结合（无个人账户）']],
 '中山':[['zsAccount','中山 · 统账结合'],['zsSingle','中山 · 单建统筹']]
};
for(const r of records.苏州)if(r.values.medicalP!==undefined)r.plan='wj';
for(const r of records.深圳)if(r.values.medicalP!==undefined){const rates={medicalP:r.values.medicalP,medicalC:r.values.medicalC};delete r.values.medicalP;delete r.values.medicalC;record(['深圳'],rates,{...r.source,label:'深圳2026职工医保一档费率'},r.from,r.to);records.深圳.at(-1).plan='sz1';break;}
const planRecord=(city,plan,values,src,from='2026-07',to='2026-12')=>{record([city],values,src,from,to);records[city].at(-1).plan=plan;};
planRecord('苏州','sip',{medicalP:2,fixedP:5,fixedC:0,medicalExtraC:0},source('园区税务征收标准：个人医保2%及每月5元（单位费率另按分步通知）','https://jiangsu.chinatax.gov.cn/art/2025/4/3/art_8539_371935.html'),'2026-01');
planRecord('苏州','sip',{medicalC:5},source('园区管委会：医保单位费率分步调整，2026年4月前5%','https://jiangsu.chinatax.gov.cn/art/2023/4/14/art_22451_885.html'),'2026-01','2026-03');
planRecord('苏州','sip',{medicalC:6},source('园区管委会：2026年4月1日起医保单位6%','https://jiangsu.chinatax.gov.cn/art/2023/4/14/art_22451_885.html'),'2026-04','2026-12');
record(['上海'],{fundRounding:0},source('上海公积金业务资料：单位个人各自月缴存额元以下四舍五入','https://www.shzfgjj.cn/images/ywzlb.pdf'),'2026-07','2027-06');
record(['天津'],{pensionP:8,pensionC:16},source('天津税务：2022年起养老单位16%、个人8%','https://tianjin.chinatax.gov.cn/11200000000/0300/030002/20211009154650282.shtml'));
record(regions.河北,{pensionP:8,pensionC:16},source('廊坊人社2026企业职工养老政策解答（河北省口径）','https://rsj.lf.gov.cn/ecdomain/fileHandle.do?action=read&infoChecked=0&objectID=20260820101922548'));
record(regions['大湾区内地'],{pensionP:8},source('人社部社会保险法释义：企业职工个人养老统一8%（仅引用该项）','https://www.mohrss.gov.cn/fgs/syshehuibaoxianfa/201208/t20120806_28572.html'));
planRecord('深圳','sz2',{medicalP:.5,medicalC:1.5},source('深圳医保局：职工医保二档费率','https://hsa.sz.gov.cn/fzlm/znts/zcwd/ylbz/content/post_11092741.html'),'2026-01');
record(['广州'],{medicalP:2,medicalC:6,birthC:.85,medicalExtraC:0},source('广州医保2023—2026阶段性费率：单位6%、个人2%、生育0.85%','https://www.gz.gov.cn/gfxwj/sbmgfxwj/gzsylbzj/content/post_8689834.html'));
record(['佛山'],{medicalMin:4669,medicalMax:9660,medicalP:2,medicalC:4.5,birthC:1},source('佛山税务：2026年职工医保及生育缴费','https://guangdong.chinatax.gov.cn/gdsw/fssw_tzgg/2025-12/26/content_1ef0102803aa439da6549c69b4caa81e.shtml'),'2026-01');
record(['江门'],{medicalMin:4280,medicalMax:21399,medicalP:2,medicalC:6,birthC:0},source('江门医保局：2026年费率及基数（单位含生育）','https://www.jiangmen.gov.cn/bmpd/jmsylbzj/zwgk/zcfg/bjwj/content/post_3413909.html'),'2026-01');
const dgMedical=source('东莞医保局：2026年7—12月缴费标准','https://www.dg.gov.cn/ylbzj/gkmlpt/content/4/4553/post_4553461.html');
record(['东莞'],{medicalMin:4775,medicalMax:27549,birthC:.7,medicalExtraC:.5},dgMedical);
for(const [plan,medicalP,medicalC]of [['dgSingle',.5,2.45],['dgAccount',2,5],['dgNoAccount',.5,4.5]])planRecord('东莞',plan,{medicalP,medicalC},dgMedical);
const zsMedical=source('中山医保局：2026年医保缴费标准','https://hsa.zs.gov.cn/attachment/0/558/558340/2583314.pdf');
record(['中山'],{medicalMin:4250,medicalMax:21250,medicalExtraC:0},zsMedical,'2026-01');
for(const [plan,medicalP,medicalC]of [['zsAccount',2,5.8],['zsSingle',.7,3.3]])planRecord('中山',plan,{medicalP,medicalC},zsMedical,'2026-01');
record(['常州'],{medicalP:2,medicalC:8,birthC:.8},source('常州税务2026征收标准：基本医保8%及生育0.8%分别列示','https://jiangsu.chinatax.gov.cn/art/2026/5/22/art_8539_372039.html'),'2026-05');
record(['南京'],{fundMin:2660,fundMax:42400,fundRateMax:12},source('南京公积金：2026年度基数调整','https://gjj.nanjing.gov.cn/zwgk/tzgg/202607/t20260717_5878580.html'),'2026-07','2027-06');
record(['连云港'],{fundMin:2260,fundMax:31545,fundRateMax:12,fundRounding:0},source('连云港公积金：2026年度基数及金额取整','https://www.lyg.gov.cn/zglygzfmhwz/zcwj_zffw/content/92db1896-3c45-497f-b6d6-a101ac694293.html'),'2026-01');
record(['常州'],{fundMin:2660,fundMax:34080},source('常州公积金：2026年7月基数上下限答复','https://gjj.changzhou.gov.cn/html/gjj/2026/ODOFKMDN_0706/13968.html'));
record(['东莞'],{fundMin:2080,fundMax:27391,fundRateMax:12},source('东莞公积金：2026年原缴存基数（7月上限另有调整）','https://dggjj.dg.gov.cn/zwgk/zfxxgkml/qt/tzgg/content/post_4472090.html'),'2026-01','2026-06');
const dgFund=source('东莞公积金：东公积金通〔2026〕36号，7月上限27700、9月下限分人员','http://dggjj.dg.gov.cn/xwdt/zxdt/content/post_4577715.html');
record(['东莞'],{fundMin:2080,fundMax:27700,fundRateMax:12},dgFund,'2026-07','2026-08');
record(['东莞'],{fundMax:27700,fundRateMax:12},dgFund,'2026-09','2026-12');
record(['无锡'],{fundMin:2490,fundMax:36800,fundRateMax:12},source('无锡公积金：锡房金规〔2026〕2号，最低按上一年度最低工资','https://www.wuxi.gov.cn/gjj/doc/2026/08/05/4814421.shtml'),'2026-07','2027-06');
const gzFund=source('广州公积金：2026缴存年度调整，上限41697','https://gjj.gz.gov.cn/gg/tzgg/content/post_10879601.html');
record(['广州'],{fundMin:2500,fundMax:41697,fundRateMax:12},gzFund,'2026-07','2026-08');
record(['广州'],{fundMax:41697,fundRateMax:12},gzFund,'2026-09','2027-06');
record(['广州'],{fundMin:2680},source('广州公积金：穗公积金中心〔2026〕57号，9月起下限2680','https://gjj.gz.gov.cn/gkmlpt/content/10/10983/post_10983424.html'),'2026-09','2027-06');
record(['惠州'],{fundMax:34290,fundRateMax:12},source('惠州公积金：2026年度正式通知，上限34290、比例5%—12%','http://hzgjj.huizhou.gov.cn/zwgk/bmwj/bmxgwj/content/post_5798098.html'),'2026-07','2027-06');
record(['惠州'],{fundMin:2040},source('江门政府：2026年9月起广东最低工资分地区标准（惠州2040）','https://www.jiangmen.gov.cn/newzwgk/hygq/content/post_3542677.html'),'2026-09','2026-12');
record(['泰州'],{fundMax:30258,fundRateMax:12},source('泰州公积金：2026年度调整通知，上限30258','https://gjj.taizhou.gov.cn/xwzx/tzgg/art/2025/art_cff5ffd72d4441e49031016a50eeb7cd.html'),'2026-01','2026-12');
const sjzFund=source('石家庄公积金：石公积金〔2026〕10号，含区县及低于5588的审核条件','https://www.sjzgjj.cn/tzgg/2479.jhtml');
record(['石家庄'],{fundMax:27938},sjzFund,'2026-07','2027-06');
record(['廊坊'],{fundMin:2380,fundMax:30261},source('廊坊公积金：2026年度缴存基数调整（官方图文）','https://www.lfzfgjj.net/website/notice-announ-detail.html?seqno=9071&itemId=09'),'2026-07','2027-06');
record(['天津'],{fundMin:2510,fundMax:28917},source('天津公积金：2026年度缴存额调整政策解读','https://www.zfgjj.cn/tjgjjcms/mainSiteApp/content/app_zwgk/app_zcwj/app_zcjd/app_zcjd/379429.html'),'2026-07','2027-06');
// Independent source fields are merged; an old transition notice cannot override the annual notice.
const zsFund=source('中山公积金：2026年度缴存基数与缴存额调整','https://zszfgjj.zs.gov.cn/gkmlpt/content/2/2630/post_2630600.html');
record(['中山'],{fundMin:2080,fundMax:29430,fundRateMax:12},zsFund,'2026-07','2026-08');
record(['中山'],{fundMax:29430,fundRateMax:12},zsFund,'2026-09','2027-06');
record(['北京'],{medicalC:8.8,medicalExtraC:1},source('海淀政务：单位医保9.8%=医疗生育8.8%+大额互助1%','https://www.bjhd.gov.cn/zsk/ldrsjc/shbz/202112/t20211203_4499330.shtml'));
record(['苏州'],{birthC:.8},source('苏州医保：苏州政规〔2026〕10号，10月起全市生育费率0.8%','https://ybj.suzhou.gov.cn/szybj/zcfg/202608/23b2f70f8dc0483eb58d89c97f2e07a4.shtml'),'2026-10','2026-12');
// Scope notes travel with both the form and calculation/export. A single city-wide
// minimum must not silently replace a district, employment or approval condition.
const policyNote=(city,note,src,from,to)=>{record([city],{},src,from,to);records[city].at(-1).note=note;};
policyNote('东莞','公积金：9月起新参加工作、新调入职工下限2300元；存量职工2026年内仍为2080元。请填写员工已核定基数，不默认套用同一下限。',dgFund,'2026-09','2026-12');
policyNote('泰州','公积金下限：海陵、姜堰、高港2660元；靖江、泰兴、兴化2430元。请按区县填写已核定基数。',source('泰州公积金：2026年最低基数补充通知','https://gjj.taizhou.gov.cn/xwzx/tzgg/art/2026/art_0d3c5588297a49238c3c81696f195096.html'),'2026-01','2026-12');
policyNote('石家庄','公积金下限按区县为2380、2230或2080元；上年月均工资低于5588元，调整基数须经所属管理部审核。请填写已核定基数。',sjzFund,'2026-07','2027-06');
policyNote('中山','公积金：9月起新参加工作、新调入职工下限2300元；存量职工到2027年度再调整。请填写员工已核定基数。',source('中山公积金：最低工资调整后的人员适用范围','https://zszfgjj.zs.gov.cn/tzgg/content/post_2646242.html'),'2026-09','2027-06');
policyNote('佛山','公积金：9月起新参加工作、新调入职工下限2300元；存量职工仍为2080元，2027年7月起调整。人员类别未自动区分，请填写已核定基数。',source('顺德区政府：佛山公积金缴存下限调整通知','https://sdjy.shunde.gov.cn/index.php/index/policy/detail.html?columnName=%E6%94%BF%E7%AD%96%E6%B3%95%E8%A7%84&id=3590'),'2026-09','2026-12');
policyNote('江门','公积金：9月起新参加工作、新调入职工下限2040元；原低基数须在2027年7月31日前调整，过渡期不默认统一下限。请填写员工已核定基数。',source('江门公积金：江房金字〔2026〕25号，下限分人员执行','https://www.jiangmen.gov.cn/bmpd/jmszfhcxjsj/zfgl/gjjzc/gjzc/content/post_3544755.html'),'2026-09','2026-12');
// Audited observations are retained, but unofficial reposts no longer drive calculations.
export function cityPolicy(city,month,context={}){
 if(!cityOptions.some(([name])=>name===city))throw Error('请选择目录中的城市');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month)))throw Error('请选择有效缴费月份');
 const all=records[city]||[],active=all.filter(x=>month>=x.from&&month<=x.to&&x.status!=='转载待复核'&&(!x.plan||x.plan===context.medicalPlan));
 const values={},evidence={};for(const row of active)for(const [key,value]of Object.entries(row.values)){values[key]=value;evidence[key]=row;}
 return {city,month,values,evidence,notes:active.filter(r=>r.note).map(r=>({text:r.note,source:r.source})),sources:[...new Map(active.map(r=>[r.source.url,r])).values()],historical:all.filter(x=>x.to<month),pending:all.filter(x=>x.status==='转载待复核'),unsupported:false,checked:'2026-10-16',version:`city-20261016-r2/${city}/${month}/${context.medicalPlan||'standard'}`};
}
