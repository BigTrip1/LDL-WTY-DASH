import{a as ro,b as K}from"./chunk-F4OH3WCS.js";import{b as G}from"./chunk-6JPMUFRE.js";import{p as z}from"./chunk-WGNEAE3R.js";import"./chunk-4AHMJKMX.js";import{a as A}from"./chunk-QAHV32LZ.js";import"./chunk-XOG6G6ZX.js";import{_a as p,d as J,n as $}from"./chunk-NZBVGICY.js";import{a as M,c}from"./chunk-UTR7UZ6P.js";import"./chunk-B2FCEPRT.js";import{h as _}from"./chunk-UDRDD4TZ.js";import{a as x}from"./chunk-QQJPKFTO.js";import"./chunk-YW5FUI3G.js";import"./chunk-JQE54VLJ.js";import"./chunk-SQMP44WM.js";import"./chunk-WJBUW6MZ.js";import"./chunk-JB2B56TQ.js";import{b as R,f as F}from"./chunk-L2WOLP3T.js";import"./chunk-TDGKP7HN.js";import{b as I}from"./chunk-BDAJYGKT.js";import"./chunk-3RZ6H23F.js";import"./chunk-FCSB5JJP.js";import"./chunk-GTMSER7O.js";import{a as N}from"./chunk-UPPQC44E.js";import{a as E}from"./chunk-OJPBMZQC.js";import"./chunk-CYENH7PC.js";import{V as D}from"./chunk-KCBBPPRO.js";import"./chunk-YCHJLGQ6.js";import{kb as to}from"./chunk-5C2D56AQ.js";import"./chunk-4NQTCOMC.js";import{Lc as P,Ub as T,bd as l,vc as U}from"./chunk-ETNEVDD4.js";import"./chunk-QB5BKN2E.js";import{e as v,f as m,qb as f,t as C}from"./chunk-77AVS43W.js";import"./chunk-DE4Q3KR7.js";import"./chunk-JGTM4BNO.js";import"./chunk-U7OZEJ4F.js";import"./chunk-ZRGHR2IN.js";import{a as e,g as i,i as a,n as s}from"./chunk-TSHWMJEM.js";a();s();var No=i(v(),1);var Y=i(ro(),1);a();s();var h=i(v(),1);a();s();var Q=i(to(),1);var o=i(m(),1),g=f.colors.legacy.spotNegative,io=c.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background-color: ${f.colors.brand.white};
  padding: clamp(24px, 16vh, 256px) 24px;
  box-sizing: border-box;
`,eo=c.div`
  margin-bottom: 24px;
  padding-bottom: 8vh;
`,no=c.div`
  max-width: 100ch;
  margin: auto;

  * {
    text-align: left;
  }
`,H=c.a`
  text-decoration: underline;
  color: ${g};
`,u=new E,V=e(({origin:t,subdomain:n,source:w})=>{let{t:d}=C(),Z=t?F(t):"",k=w||Z,j=t??"",L=new URL(j),O=L.hostname,W=n==="true"?O:k,S=(0,Q.toUnicode)(W),oo=e(async()=>{if(n==="true"){let y=await u.get(l.UserWhitelistSubdomains),r=JSON.parse(`${y}`);r?r.push(O):r=[O],r=[...new Set(r)],u.set(l.UserWhitelistSubdomains,JSON.stringify(r))}else{let y=await u.get(l.UserWhitelistedOrigins),r=JSON.parse(`${y}`);r?r.push(k):r=[k],r=[...new Set(r)],u.set(l.UserWhitelistedOrigins,JSON.stringify(r))}["http:","https:"].includes(L.protocol)&&self.location.assign(t)},"handleClick");return(0,o.jsx)(io,{children:(0,o.jsxs)(no,{children:[(0,o.jsx)(eo,{children:(0,o.jsx)($,{width:128,fill:f.colors.brand.white})}),(0,o.jsx)(p,{size:30,color:g,weight:"600",children:d("blocklistOriginDomainIsBlocked",{domainName:S||d("blocklistOriginThisDomain")})}),(0,o.jsx)(p,{color:g,children:d("blocklistOriginSiteIsMalicious")}),(0,o.jsx)(p,{color:g,children:(0,o.jsxs)(I,{i18nKey:"blocklistOriginCommunityDatabaseInterpolated",children:["This site has been flagged as part of a",(0,o.jsx)(H,{href:R,rel:"noopener",target:"_blank",children:"community-maintained database"}),"of known phishing websites and scams. If you believe the site has been flagged in error,",(0,o.jsx)(H,{href:R,rel:"noopener",target:"_blank",children:"please file an issue"}),"."]})}),W?(0,o.jsx)(p,{color:g,onClick:oo,hoverUnderline:!0,children:d("blocklistOriginIgnoreWarning",{domainName:S})}):(0,o.jsx)(o.Fragment,{})]})})},"BlocklistOrigin");var b=i(m(),1),ao=e(()=>{let t;try{t=new URLSearchParams(self.location.search).get("origin")||"",new URL(t)}catch{t=""}return t},"getOriginParam"),so=e(()=>new URLSearchParams(self.location.search).get("subdomain")||"","getSubdomainParam"),mo=e(()=>new URLSearchParams(self.location.search).get("source")||"","getSourceParam"),X=e(()=>{let t=(0,h.useMemo)(()=>ao(),[]),n=(0,h.useMemo)(()=>so(),[]),w=(0,h.useMemo)(()=>mo(),[]);return(0,b.jsx)(J,{future:{v7_startTransition:!0},children:(0,b.jsx)(z,{children:(0,b.jsx)(V,{origin:t,subdomain:n,source:w})})})},"Blocklist");var B=i(m(),1);N();T([[P,x]]);U.init({provider:K});await D(x);await _("frontend",G);var lo=document.getElementById("root"),co=(0,Y.createRoot)(lo);co.render((0,B.jsx)(M,{theme:A,children:(0,B.jsx)(X,{})}));
//# sourceMappingURL=Phishing.js.map
