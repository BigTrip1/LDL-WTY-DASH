import{a as Z}from"./chunk-MGQE2JIJ.js";import{a as U}from"./chunk-CNAXKHA5.js";import{a as G}from"./chunk-GUV4KSBJ.js";import{b as F}from"./chunk-FUJBXGVU.js";import{b as $}from"./chunk-FRR2GBIK.js";import{W as K}from"./chunk-RY2D6EBR.js";import"./chunk-MTLIJX3D.js";import{k as B}from"./chunk-WF6IU6IP.js";import"./chunk-VQF4OTRD.js";import"./chunk-36SX7FFX.js";import"./chunk-UME43M3J.js";import"./chunk-K3AOJOH2.js";import"./chunk-WFNPZV5Q.js";import{a as R}from"./chunk-DR7D63ML.js";import"./chunk-NJFQCTJA.js";import"./chunk-SKJQNFAY.js";import"./chunk-FVYUEMFF.js";import"./chunk-SMVIMJOX.js";import"./chunk-PA2NRDYY.js";import"./chunk-YBR72OES.js";import"./chunk-EUDFBP3M.js";import{g as Q}from"./chunk-I542BBJZ.js";import{a as O}from"./chunk-OHU2I7QU.js";import"./chunk-GBAAAYCS.js";import"./chunk-75MPFIEZ.js";import{a as V}from"./chunk-GZQIQP4B.js";import"./chunk-EDHMW5JA.js";import"./chunk-BQIGLF2B.js";import"./chunk-ZYLOAF4B.js";import"./chunk-37DWNT3Z.js";import"./chunk-PCZDUKPX.js";import"./chunk-7KMSH7LT.js";import"./chunk-EOII3ZM4.js";import"./chunk-4AQPJCXC.js";import"./chunk-WGNEAE3R.js";import"./chunk-4AHMJKMX.js";import"./chunk-QAHV32LZ.js";import{c as z}from"./chunk-XOG6G6ZX.js";import{_a as H,x as D}from"./chunk-NZBVGICY.js";import{c as s}from"./chunk-UTR7UZ6P.js";import"./chunk-YW5FUI3G.js";import"./chunk-JQE54VLJ.js";import{aa as E,ha as A,ka as _,la as N}from"./chunk-SQMP44WM.js";import"./chunk-WJBUW6MZ.js";import"./chunk-JB2B56TQ.js";import"./chunk-L2WOLP3T.js";import"./chunk-TDGKP7HN.js";import"./chunk-BDAJYGKT.js";import"./chunk-3RZ6H23F.js";import"./chunk-FCSB5JJP.js";import"./chunk-GTMSER7O.js";import"./chunk-UPPQC44E.js";import"./chunk-OJPBMZQC.js";import"./chunk-CYENH7PC.js";import"./chunk-KCBBPPRO.js";import{F as v}from"./chunk-YCHJLGQ6.js";import"./chunk-5C2D56AQ.js";import"./chunk-4NQTCOMC.js";import{wd as W}from"./chunk-ETNEVDD4.js";import"./chunk-QB5BKN2E.js";import{Fc as P,e as M,f as b,ob as L,qb as w,t as h,zc as k}from"./chunk-77AVS43W.js";import"./chunk-DE4Q3KR7.js";import"./chunk-JGTM4BNO.js";import"./chunk-U7OZEJ4F.js";import"./chunk-ZRGHR2IN.js";import{a as I,g as p,i as f,n as C}from"./chunk-TSHWMJEM.js";f();C();var n=p(M(),1);f();C();var X=p(M(),1);var o=p(b(),1),j=L({marginLeft:4}),ee=s(R).attrs({align:"center",padding:"10px"})`
  background-color: ${w.colors.legacy.elementBase};
  border-radius: 6px;
  height: 74px;
  margin: 4px 0;
`,te=s.div`
  display: flex;
  align-items: center;
`,oe=s(O)`
  flex: 1;
  min-width: 0;
  text-align: left;
  align-items: normal;
`,ie=s(H).attrs({size:16,weight:600,lineHeight:19,noWrap:!0,maxWidth:"175px",textAlign:"left"})``,ne=s(H).attrs({color:w.colors.legacy.textDiminished,size:14,lineHeight:17,noWrap:!0})`
  text-align: left;
  margin-top: 5px;
`,le=s.div`
  width: 55px;
  min-width: 55px;
  max-width: 55px;
  height: 55px;
  min-height: 55px;
  max-height: 55px;
  aspect-ratio: 1;
  margin-right: 10px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`,q=X.default.memo(e=>{let{t:l}=h(),{collection:i,unknownItem:c,isHidden:a,isSpam:r,onToggleHidden:g}=e,{name:d,id:u}=i,m=_(i),y=N(i),S=A(m?.media,"image",!1,"small"),x=d||m?.name||c;return(0,o.jsxs)(ee,{children:[(0,o.jsx)(le,{children:r&&a?(0,o.jsx)(Z,{width:32}):S?(0,o.jsx)(F,{uri:S}):(0,o.jsx)($,{type:"image",width:42})}),(0,o.jsx)(R,{children:(0,o.jsxs)(oe,{children:[(0,o.jsxs)(te,{children:[(0,o.jsx)(ie,{children:x}),r?(0,o.jsx)(D,{className:j,fill:w.colors.legacy.spotWarning,height:16,width:16}):null]}),(0,o.jsx)(ne,{children:l("collectiblesSearchNrOfItems",{nrOfItems:y})})]})}),(0,o.jsx)(U,{id:u,label:`${d} visible`,checked:!a,onChange:T=>{g(T.target.checked?"show":"hide")}})]})});var t=p(b(),1),se=74,ae=10,re=se+ae,me=20,ce=s.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`,de=s.div`
  position: relative;
  width: 100%;
`,pe=I(()=>{let{handleHideModalVisibility:e}=K(),{data:l,isPending:i}=v(),{viewState:c,viewStateLoading:a}=E({account:l}),r=(0,n.useCallback)(()=>e("collectiblesVisibility"),[e]),g=(0,n.useMemo)(()=>({...c,handleCloseModal:r}),[r,c]),d=(0,n.useMemo)(()=>i||a,[i,a]);return{data:g,loading:d}},"useProps"),ge=n.default.memo(e=>{let{t:l}=h(),i=(0,n.useRef)(null);return(0,n.useEffect)(()=>{setTimeout(()=>i.current?.focus(),200)},[]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(de,{children:(0,t.jsx)(Q,{ref:i,tabIndex:0,placeholder:l("assetListSearch"),maxLength:W,onChange:e.handleSearch,value:e.searchQuery,name:"Search collectibles"})}),(0,t.jsx)(B,{children:(0,t.jsx)(k,{children:({height:c,width:a})=>(0,t.jsx)(P,{style:{padding:`${me}px 0`},scrollToIndex:e.searchQuery!==e.debouncedSearchQuery?0:void 0,height:c,width:a,rowCount:e.listItems.length,rowHeight:re,rowRenderer:r=>(0,t.jsx)(he,{...r,data:e.listItems,unknownItem:l("assetListUnknownToken"),getIsHidden:e.getIsHidden,getIsSpam:e.getIsSpam,getSpamStatus:e.getSpamStatus,onToggleHidden:e.onToggleHidden})})})})]})}),he=I(e=>{let{index:l,data:i,style:c,unknownItem:a,getIsHidden:r,getIsSpam:g,getSpamStatus:d,onToggleHidden:u}=e,m=i[l],y=r(m),S=g(m),x=d(m),T=(0,n.useCallback)(J=>u({item:m,status:J}),[u,m]);return(0,t.jsx)("div",{style:c,children:(0,t.jsx)(q,{collection:m,unknownItem:a,isHidden:y,isSpam:S,spamStatus:x,onToggleHidden:T})})},"ResultRowWrapper"),ue=I(()=>{let{data:e,loading:l}=pe(),{t:i}=h();return(0,t.jsxs)(ce,{children:[l?(0,t.jsx)(G,{}):(0,t.jsx)(ge,{...e}),(0,t.jsx)(V,{children:(0,t.jsx)(z,{onClick:e.handleCloseModal,children:i("commandClose")})})]})},"CollectiblesVisibilityPage"),Ue=ue;export{ue as CollectiblesVisibilityPage,Ue as default};
//# sourceMappingURL=CollectiblesVisibilityPage-CRHECYKW.js.map
