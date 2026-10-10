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
const jsBase=source('江苏税务：2026缴费工资申报，基数暂按4952—24762','https://gtm-cn-2r42yzjvn0s.jiangsu.chinatax.gov.cn/art/2026/1/9/art_8274_1695385.html');
const jsRates=source('江苏税务：2026吴江申报与养老、失业费率','https://jiangsu.chinatax.gov.cn/art/2026/4/14/art_21737_921.html');
const zjRates=source('浙江税务：2025年起单位养老16%','https://zhejiang.chinatax.gov.cn/art/2025/1/21/art_22104_630903.html');
const gdRates=source('广东税务：2025年起单位养老16%','https://guangdong.chinatax.gov.cn/gdsw/zqsw_tzgg/2024-12/30/content_018b45af0f1947eb81918886a2d9dfd2.shtml');
const gdBase=source('广东：2025年7月起养老基数，2026新标准待核验','https://www.shantou.gov.cn/stsshbxjj/zwgk/content/post_2508025.html');
const records={};
const record=(names,values,src,from='2026-07',to='2026-12',status='已核验')=>{for(const city of names){records[city]??=[];records[city].push({values,source:src,from,to,status});}};
record(regions.江苏,{pensionMin:4952,pensionMax:24762,medicalMin:4952,medicalMax:24762,unemploymentMin:4952,unemploymentMax:24762,injuryMin:4952,injuryMax:24762},jsBase,'2026-01','2026-12','官方暂行标准');
record(regions.江苏,{pensionP:8,pensionC:16,unemploymentP:.5,unemploymentC:.5},jsRates);
record(regions.浙江,{pensionC:16},zjRates);
record(regions.浙江,{pensionP:8},source('浙江税务：个人养老8%','https://zhejiang.chinatax.gov.cn/art/2022/3/17/art_13314_539906.html'));
record(regions.浙江,{pensionMin:4986,pensionMax:25299},source('浙江2025基数（仅历史参考，不自动套用2026）','https://zhejiang.chinatax.gov.cn/art/2025/12/11/art_13314_645797.html'),'2025-01','2025-12');
record(regions['大湾区内地'],{pensionC:16},gdRates);
record(regions['大湾区内地'],{pensionMin:4775,pensionMax:27549},gdBase,'2025-07','2025-12');
record(['广州'],{pensionMin:5510,pensionMax:27549},gdBase,'2025-07','2025-12');
record(['上海'],{pensionMin:7546,pensionMax:37731,medicalMin:7546,medicalMax:37731,unemploymentMin:7546,unemploymentMax:37731,injuryMin:7546,injuryMax:37731},source('上海人社：2026年7月起社保基数','https://rsj.sh.gov.cn/tdjjf_17554/20260824/t0035_1443297.html'));
record(['上海'],{pensionP:8,pensionC:16},source('上海发改委：养老费率','https://fgw.sh.gov.cn/ys-laogong-2.3.1.2/index.html'));
record(['上海'],{medicalP:2,medicalC:8.5,medicalExtraC:.5,birthC:0,fixedP:0,fixedC:0},source('上海医保2026阶段性费率（基本含生育）','https://www.shanghai.gov.cn/gwk/search/content/921e047144694b61b6df8ca0c5ef2cfc'),'2026-03','2027-02');
record(['上海'],{unemploymentP:.5},source('上海2026职工个人失业费率','https://www.shanghai.gov.cn/nw17239/20260913/37398bbb63ad4fffa64e0b9deb0f6afc.html'));
record(['上海'],{fundMin:2740,fundMax:37731,fundRateMax:7,fundRounding:0},source('上海2026公积金通知转载：原发布页待复核','https://www.pd-italent.com/Article/202608/202608210007.shtml'),'2026-07','2027-06','转载待复核');
record(['北京'],{pensionMin:7270,pensionMax:36348,medicalMin:7270,medicalMax:36348,unemploymentMin:7270,unemploymentMax:36348,injuryMin:7270,injuryMax:36348},source('北京2026五险基数','https://rsj.beijing.gov.cn/xxgk/2024zcjd/202608/t20260821_4831476.html'));
record(['北京'],{pensionP:8,pensionC:16,unemploymentP:.5,unemploymentC:.5,medicalP:2,medicalC:9.8,medicalExtraC:0,birthC:0,fixedP:3,fixedC:0},source('北京市商务局2026投资指南：职工缴费表','https://sw.beijing.gov.cn/zwxx/swxx/202605/P020260512520283489932.pdf'));
record(['北京'],{fundMin:2540,fundMax:36348,fundRateMax:12,fundRounding:0},source('北京2026公积金年度通知','https://gjj.beijing.gov.cn/web/zwgk61/2024zcwj/436433461/744103382/index.html'),'2026-07','2027-06');
record(['天津'],{medicalP:2,medicalC:10.5,medicalExtraC:0,birthC:0},source('天津2026职工医保通知：普通单位，含生育','https://www.tj.gov.cn/zwgk/szfgb/xqk/2026/12/bmgfxwj/202607/t20260703_7329233.html'),'2026-06','2026-12');
record(['苏州'],{medicalP:2,medicalC:7,birthC:.8,medicalExtraC:0,fixedP:5,fixedC:0},jsRates);
record(['杭州'],{medicalP:2,medicalC:9.5,birthC:0,medicalExtraC:0},source('杭州职工医保统一费率，含生育','https://zfgb.hangzhou.gov.cn/11/105220253/t116220253054/518112.shtml'));
record(['深圳'],{medicalMin:6727,medicalMax:33633,medicalP:2,medicalC:6,medicalExtraC:0},source('深圳医保2026缴费通知：默认一档','https://hsa.sz.gov.cn/xwzx/tzgg/content/post_12567884.html'),'2026-01','2026-12');
record(['深圳'],{birthC:.5},source('深圳医疗保障办法：生育按医保基数0.5%','https://hsa.sz.gov.cn/ztzl/szsylbzbf/content/post_10875761.html'));
record(['天津'],{pensionMin:5180,pensionMax:25902,medicalMin:5180,medicalMax:25902,unemploymentMin:5180,unemploymentMax:25902,injuryMin:5180,injuryMax:25902},source('天津人社等三部门2026标准：9月1日起执行','https://www.tjftz.gov.cn/contents/6256/382302.html'),'2026-09','2026-12');
// Distinct insurance schemes must be selected explicitly; a district is not a city-wide default.
export const medicalPlans={
 '深圳':[['sz1','深圳 · 职工医保一档'],['sz2','深圳 · 职工医保二档']],
 '苏州':[['wj','苏州 · 吴江普通企业职工'],['other','苏州 · 其他区域（参数尚未接入）']],
 '东莞':[['dgSingle','东莞 · 单建统筹'],['dgAccount','东莞 · 统账结合（有个人账户）'],['dgNoAccount','东莞 · 统账结合（无个人账户）']],
 '中山':[['zsAccount','中山 · 统账结合'],['zsSingle','中山 · 单建统筹']]
};
for(const r of records.苏州)if(r.values.medicalP!==undefined)r.plan='wj';
for(const r of records.深圳)if(r.values.medicalP!==undefined){const rates={medicalP:r.values.medicalP,medicalC:r.values.medicalC};delete r.values.medicalP;delete r.values.medicalC;record(['深圳'],rates,{...r.source,label:'深圳2026职工医保一档费率'},r.from,r.to);records.深圳.at(-1).plan='sz1';break;}
const planRecord=(city,plan,values,src,from='2026-07',to='2026-12')=>{record([city],values,src,from,to);records[city].at(-1).plan=plan;};
record(['天津'],{pensionP:8,pensionC:16},source('天津税务：2022年起养老单位16%、个人8%','https://tianjin.chinatax.gov.cn/11200000000/0300/030002/20211009154650282.shtml'));
record(regions.河北,{pensionP:8,pensionC:16},source('廊坊人社2026企业职工养老政策解答（河北省口径）','https://rsj.lf.gov.cn/ecdomain/fileHandle.do?action=read&infoChecked=0&objectID=20260820101922548'));
record(regions['大湾区内地'],{pensionP:8},source('广东省政府：企业职工养老个人缴费8%（仅引用个人费率）','https://www.gd.gov.cn/hdjl/hygq/content/post_73285.html'));
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
record(['常州'],{medicalP:2,medicalC:8.8,birthC:0},source('常州医保局：2026年职工医保政策（含生育）','https://ybj.changzhou.gov.cn/uploadfile/ybj/2026/0202/20260202141145_63230.pdf'),'2026-02');
record(['南京'],{fundMin:2660,fundMax:42400,fundRateMax:12},source('南京公积金：2026年度基数调整','https://gjj.nanjing.gov.cn/zwgk/tzgg/202607/t20260717_5878580.html'),'2026-07','2027-06');
record(['连云港'],{fundMin:2260,fundMax:31545,fundRateMax:12,fundRounding:0},source('连云港公积金：2026年度基数及金额取整','https://www.lyg.gov.cn/zglygzfmhwz/zcwj_zffw/content/92db1896-3c45-497f-b6d6-a101ac694293.html'),'2026-01');
record(['常州'],{fundMin:2660,fundMax:34080},source('常州公积金：2026年7月基数上下限答复','https://gjj.changzhou.gov.cn/html/gjj/2026/ODOFKMDN_0706/13968.html'));
record(['东莞'],{fundMin:2080,fundMax:27391,fundRateMax:12},source('东莞公积金：2026年缴存基数调整','https://dggjj.dg.gov.cn/zwgk/zfxxgkml/qt/tzgg/content/post_4472090.html'),'2026-01');
record(['天津'],{fundMin:2510,fundMax:28917},source('天津公积金：2026年度缴存额调整政策解读','https://www.zfgjj.cn/tjgjjcms/mainSiteApp/content/app_zwgk/app_zcwj/app_zcjd/app_zcjd/379429.html'),'2026-07','2027-06');
// Officially confirmed fields are usable independently. Do not infer a current upper limit
// from an expired transition value or apply new-employee rules to existing employees.
record(['上海'],{fundMin:2740,fundRateMax:7},source('上海公积金：2026年度调整提示（本条仅采用下限，过渡上限不延用）','https://www.shzfgjj.cn/html/zyxw/228430.html'),'2026-07','2027-06');
const zsFund=source('中山公积金：2026年度缴存基数与缴存额调整','https://zszfgjj.zs.gov.cn/gkmlpt/content/2/2630/post_2630600.html');
record(['中山'],{fundMin:2080,fundMax:29430,fundRateMax:12},zsFund,'2026-07','2026-08');
record(['中山'],{fundMax:29430,fundRateMax:12},zsFund,'2026-09','2027-06');
record(['北京'],{medicalC:8.8,medicalExtraC:1},source('海淀政务：单位医保9.8%=医疗生育8.8%+大额互助1%','https://www.bjhd.gov.cn/zsk/ldrsjc/shbz/202112/t20211203_4499330.shtml'));
// Audited observations are retained, but unofficial reposts no longer drive calculations.
export function cityPolicy(city,month,context={}){
 if(!cityOptions.some(([name])=>name===city))throw Error('请选择目录中的城市');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month)))throw Error('请选择有效缴费月份');
 const all=records[city]||[],active=all.filter(x=>month>=x.from&&month<=x.to&&x.status!=='转载待复核'&&(!x.plan||x.plan===context.medicalPlan));
 const values={},evidence={};for(const row of active)for(const [key,value]of Object.entries(row.values)){values[key]=value;evidence[key]=row;}
 return {city,month,values,evidence,sources:[...new Map(active.map(r=>[r.source.url,r])).values()],historical:all.filter(x=>x.to<month),pending:all.filter(x=>x.status==='转载待复核'),unsupported:false,checked:'2026-10-01',version:`city-20261001/${city}/${month}/${context.medicalPlan||'standard'}`};
}
