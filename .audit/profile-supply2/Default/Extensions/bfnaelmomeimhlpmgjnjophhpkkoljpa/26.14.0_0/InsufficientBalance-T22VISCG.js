import{a as f,c as m}from"./chunk-UDFPMF7V.js";import{a as F}from"./chunk-DW3YYBO5.js";import"./chunk-TUIZWZ3Z.js";import{E as w,W as R}from"./chunk-RY2D6EBR.js";import"./chunk-MTLIJX3D.js";import"./chunk-WF6IU6IP.js";import"./chunk-VQF4OTRD.js";import"./chunk-36SX7FFX.js";import"./chunk-UME43M3J.js";import"./chunk-K3AOJOH2.js";import"./chunk-WFNPZV5Q.js";import"./chunk-DR7D63ML.js";import"./chunk-NJFQCTJA.js";import"./chunk-SKJQNFAY.js";import"./chunk-FVYUEMFF.js";import"./chunk-SMVIMJOX.js";import"./chunk-PA2NRDYY.js";import"./chunk-YBR72OES.js";import"./chunk-EUDFBP3M.js";import"./chunk-I542BBJZ.js";import"./chunk-OHU2I7QU.js";import"./chunk-GBAAAYCS.js";import"./chunk-75MPFIEZ.js";import"./chunk-GZQIQP4B.js";import"./chunk-EDHMW5JA.js";import"./chunk-BQIGLF2B.js";import"./chunk-ZYLOAF4B.js";import"./chunk-37DWNT3Z.js";import"./chunk-PCZDUKPX.js";import"./chunk-7KMSH7LT.js";import"./chunk-EOII3ZM4.js";import"./chunk-4AQPJCXC.js";import"./chunk-WGNEAE3R.js";import"./chunk-4AHMJKMX.js";import"./chunk-QAHV32LZ.js";import{c as T,d as b}from"./chunk-XOG6G6ZX.js";import{_a as s}from"./chunk-NZBVGICY.js";import{c as t}from"./chunk-UTR7UZ6P.js";import"./chunk-YW5FUI3G.js";import"./chunk-JQE54VLJ.js";import"./chunk-SQMP44WM.js";import"./chunk-WJBUW6MZ.js";import"./chunk-JB2B56TQ.js";import"./chunk-L2WOLP3T.js";import"./chunk-TDGKP7HN.js";import"./chunk-BDAJYGKT.js";import"./chunk-3RZ6H23F.js";import"./chunk-FCSB5JJP.js";import"./chunk-GTMSER7O.js";import"./chunk-UPPQC44E.js";import"./chunk-OJPBMZQC.js";import"./chunk-CYENH7PC.js";import"./chunk-KCBBPPRO.js";import"./chunk-YCHJLGQ6.js";import"./chunk-5C2D56AQ.js";import"./chunk-4NQTCOMC.js";import{Kb as B,nb as l,ub as x}from"./chunk-ETNEVDD4.js";import"./chunk-QB5BKN2E.js";import{Fb as I,e as M,f as h,qb as a,t as C}from"./chunk-77AVS43W.js";import"./chunk-DE4Q3KR7.js";import"./chunk-JGTM4BNO.js";import"./chunk-U7OZEJ4F.js";import"./chunk-ZRGHR2IN.js";import{a as d,g as c,i as y,n as g}from"./chunk-TSHWMJEM.js";y();g();var k=c(M(),1);var n=c(h(),1),E=t.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: scroll;
`,N=t.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 90px;
`,S=t(s).attrs({size:28,weight:500,color:a.colors.legacy.textBase})`
  margin: 16px;
`,V=t(s).attrs({size:14,weight:400,lineHeight:17,color:a.colors.legacy.textDiminished})`
  max-width: 275px;

  span {
    color: white;
  }
`,$=d(({networkId:o,token:r})=>{let{t:e}=C(),{handleHideModalVisibility:p}=R(),u=(0,k.useCallback)(()=>{p("insufficientBalance")},[p]),v=o&&x(B(l.getChainID(o))),{canBuy:P,openBuy:D}=w({caip19:v||"",context:"modal",analyticsEvent:"fiatOnrampFromInsufficientBalance",entryPoint:"insufficientBalance"}),i=o?l.getTokenSymbol(o):e("tokens");return(0,n.jsxs)(E,{children:[(0,n.jsx)("div",{children:(0,n.jsxs)(N,{children:[(0,n.jsx)(F,{type:"failure",backgroundWidth:75}),(0,n.jsx)(S,{children:e("insufficientBalancePrimaryText",{tokenSymbol:i})}),(0,n.jsx)(V,{children:e("insufficientBalanceSecondaryText",{tokenSymbol:i})}),r?(0,n.jsxs)(I,{borderRadius:8,gap:1,marginTop:32,width:"100%",children:[(0,n.jsx)(f,{label:e("insufficientBalanceRemaining"),children:(0,n.jsx)(m,{color:a.colors.legacy.spotNegative,children:`${r.balance} ${i}`})}),(0,n.jsx)(f,{label:e("insufficientBalanceRequired"),children:(0,n.jsx)(m,{children:`${r.required} ${i}`})})]}):null]})}),P?(0,n.jsx)(b,{primaryText:e("buyAssetInterpolated",{tokenSymbol:i}),onPrimaryClicked:D,secondaryText:e("commandCancel"),onSecondaryClicked:u}):(0,n.jsx)(T,{onClick:u,children:e("commandCancel")})]})},"InsufficientBalance"),X=$;export{$ as InsufficientBalance,X as default};
//# sourceMappingURL=InsufficientBalance-T22VISCG.js.map
