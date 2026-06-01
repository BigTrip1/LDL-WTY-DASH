import{a as N,c as F,d as G,g as I}from"./chunk-FWY3AEZB.js";import{a as x}from"./chunk-GRNSRNE5.js";import"./chunk-DW3YYBO5.js";import{a as D}from"./chunk-LDCYJ3P4.js";import"./chunk-XELEUIAX.js";import"./chunk-DOOOCP4J.js";import"./chunk-I26URRB6.js";import"./chunk-NSBNB26D.js";import"./chunk-RY2D6EBR.js";import"./chunk-MTLIJX3D.js";import"./chunk-WF6IU6IP.js";import"./chunk-VQF4OTRD.js";import"./chunk-36SX7FFX.js";import"./chunk-UME43M3J.js";import"./chunk-K3AOJOH2.js";import"./chunk-WFNPZV5Q.js";import{a as L}from"./chunk-DR7D63ML.js";import"./chunk-NJFQCTJA.js";import"./chunk-SKJQNFAY.js";import"./chunk-FVYUEMFF.js";import"./chunk-SMVIMJOX.js";import"./chunk-PA2NRDYY.js";import"./chunk-YBR72OES.js";import"./chunk-EUDFBP3M.js";import"./chunk-I542BBJZ.js";import"./chunk-OHU2I7QU.js";import"./chunk-GBAAAYCS.js";import{a as C}from"./chunk-75MPFIEZ.js";import"./chunk-GZQIQP4B.js";import"./chunk-YEUYXKMK.js";import"./chunk-EDHMW5JA.js";import"./chunk-BQIGLF2B.js";import"./chunk-ZYLOAF4B.js";import"./chunk-37DWNT3Z.js";import"./chunk-PCZDUKPX.js";import"./chunk-VR5RDZT5.js";import"./chunk-W35BCKAH.js";import"./chunk-7KMSH7LT.js";import"./chunk-EOII3ZM4.js";import"./chunk-4AQPJCXC.js";import"./chunk-WGNEAE3R.js";import"./chunk-4AHMJKMX.js";import"./chunk-QAHV32LZ.js";import"./chunk-XOG6G6ZX.js";import{q as _}from"./chunk-NZBVGICY.js";import{c as s}from"./chunk-UTR7UZ6P.js";import{a as y}from"./chunk-QQJPKFTO.js";import"./chunk-YW5FUI3G.js";import"./chunk-JQE54VLJ.js";import"./chunk-SQMP44WM.js";import"./chunk-WJBUW6MZ.js";import"./chunk-JB2B56TQ.js";import"./chunk-L2WOLP3T.js";import"./chunk-TDGKP7HN.js";import"./chunk-BDAJYGKT.js";import"./chunk-3RZ6H23F.js";import"./chunk-FCSB5JJP.js";import"./chunk-GTMSER7O.js";import"./chunk-UPPQC44E.js";import"./chunk-OJPBMZQC.js";import"./chunk-CYENH7PC.js";import"./chunk-KCBBPPRO.js";import{A as O,s as $}from"./chunk-YCHJLGQ6.js";import"./chunk-5C2D56AQ.js";import"./chunk-4NQTCOMC.js";import"./chunk-ETNEVDD4.js";import"./chunk-QB5BKN2E.js";import{V as E,Vb as R,Zb as T,e as z,f as u,la as P,qb as e}from"./chunk-77AVS43W.js";import"./chunk-DE4Q3KR7.js";import"./chunk-JGTM4BNO.js";import"./chunk-U7OZEJ4F.js";import"./chunk-ZRGHR2IN.js";import{a as g,g as l,i as n,n as i}from"./chunk-TSHWMJEM.js";n();i();var f=l(z(),1);n();i();n();i();var M=s(C)`
  cursor: pointer;
  width: 24px;
  height: 24px;
  transition: background-color 200ms ease;
  background-color: ${t=>t.$isExpanded?e.colors.legacy.black:e.colors.legacy.elementAccent} !important;
  :hover {
    background-color: ${e.colors.legacy.gray};
    svg {
      fill: white;
    }
  }
  svg {
    fill: ${t=>t.$isExpanded?"white":e.colors.legacy.textDiminished};
    transition: fill 200ms ease;
    position: relative;
    ${t=>t.top?`top: ${t.top}px;`:""}
    ${t=>t.right?`right: ${t.right}px;`:""}
  }
`;var o=l(u(),1),K=s(L).attrs({justify:"space-between"})`
  background-color: ${e.colors.legacy.areaBase};
  padding: 10px 16px;
  border-bottom: 1px solid ${e.colors.legacy.borderDiminished};
  height: 46px;
  opacity: ${t=>t.opacity??"1"};
`,Q=s.div`
  display: flex;
  margin-left: 10px;
  > * {
    margin-right: 10px;
  }
`,W=s.div`
  width: 24px;
  height: 24px;
`,X=g(({onBackClick:t,totalSteps:c,currentStepIndex:d,isHidden:m,showBackButtonOnFirstStep:r,showBackButton:S=!0})=>(0,o.jsxs)(K,{opacity:m?0:1,children:[S&&(r||d!==0)?(0,o.jsx)(M,{right:1,onClick:t,children:(0,o.jsx)(_,{})}):(0,o.jsx)(W,{}),(0,o.jsx)(Q,{children:E(c).map(p=>{let h=p<=d?e.colors.legacy.spotBase:e.colors.legacy.elementAccent;return(0,o.jsx)(C,{diameter:12,color:h},p)})}),(0,o.jsx)(W,{})]}),"StepHeader");n();i();var a=l(u(),1),Z=g(()=>{let{mutateAsync:t}=O(),{hardwareStepStack:c,pushStep:d,popStep:m,currentStep:r,setOnConnectHardwareAccounts:S,setOnConnectHardwareDone:b,setExistingAccounts:p}=N(),{data:h=[],isFetched:H,isError:v}=$(),w=P(c,(k,q)=>k?.length===q.length),J=c.length>(w??[]).length,B=w?.length===0,U={initial:{x:B?0:J?150:-150,opacity:B?1:0},animate:{x:0,opacity:1},exit:{opacity:0},transition:{duration:.2}},V=(0,f.useCallback)(()=>{r()?.props.preventBack||(r()?.props.onBackCallback&&r()?.props.onBackCallback?.(),m())},[r,m]);return D(()=>{S(async k=>{await t(k),await y.set(x,!await y.get(x))}),b(()=>self.close()),d((0,a.jsx)(I,{}))},c.length===0),(0,f.useEffect)(()=>{p({data:h,isFetched:H,isError:v})},[h,H,v,p]),(0,a.jsxs)(F,{children:[(0,a.jsx)(X,{totalSteps:3,onBackClick:V,showBackButton:!r()?.props.preventBack,currentStepIndex:c.length-1}),(0,a.jsx)(R,{mode:"wait",children:(0,a.jsx)(T.div,{style:{display:"flex",flexGrow:1},...U,children:(0,a.jsx)(G,{children:r()})},`${c.length}_${w?.length}`)})]})},"SettingsConnectHardware"),Tt=Z;export{Tt as default};
//# sourceMappingURL=SettingsConnectHardware-JBD2YHBB.js.map
