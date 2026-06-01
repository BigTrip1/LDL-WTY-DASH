import{e as w,g as y,h as C,i as M}from"./chunk-56JTNSTY.js";import"./chunk-XELEUIAX.js";import{d as A}from"./chunk-FVYUEMFF.js";import"./chunk-YEUYXKMK.js";import"./chunk-EOII3ZM4.js";import{_a as k,la as f}from"./chunk-NZBVGICY.js";import{c as t}from"./chunk-UTR7UZ6P.js";import"./chunk-JQE54VLJ.js";import{b as g}from"./chunk-JB2B56TQ.js";import"./chunk-UPPQC44E.js";import"./chunk-CYENH7PC.js";import{X as s}from"./chunk-QB5BKN2E.js";import{bc as c,e as S,f as d,ic as h,qb as a,t as x}from"./chunk-77AVS43W.js";import"./chunk-JGTM4BNO.js";import{g as p,i as m,n as u}from"./chunk-TSHWMJEM.js";m();u();var o=p(S(),1);var e=p(d(),1),I=t.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 6px;
`,R=t.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`,W=t.div`
  background: ${a.colors.legacy.elementBase};
  border-radius: 6px;
  padding: 12px 16px;
`,b=t.div`
  display: flex;
  flex-direction: row;
  color: ${a.colors.legacy.textBase};
  cursor: pointer;
  font-size: 14px;
  width: fit-content;
  margin-bottom: 8px;

  > span {
    min-height: 14px !important;
    height: 14px !important;
    min-width: 14px !important;
    width: 14px !important;
    border-radius: 3px !important;
  }
`,B=t.div`
  display: flex;
  gap: 16px;
`,G=t.div`
  padding: 27px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`,H=o.default.memo(({requestId:i})=>{let{t:r}=x(),l=w(),[n,E]=(0,o.useState)(!1),T=(0,o.useCallback)(()=>{l({jsonrpc:"2.0",id:i,result:n?s.user_selectEthWallet.result.enum.ALWAYS_USE_PHANTOM:s.user_selectEthWallet.result.enum.CONTINUE_WITH_PHANTOM})},[i,l,n]),_=(0,o.useCallback)(()=>{l({jsonrpc:"2.0",id:i,result:n?s.user_selectEthWallet.result.enum.ALWAYS_USE_METAMASK:s.user_selectEthWallet.result.enum.CONTINUE_WITH_METAMASK})},[i,l,n]);return(0,e.jsxs)(C,{children:[(0,e.jsx)(y,{style:{display:"flex",alignItems:"center"},children:(0,e.jsx)(G,{children:(0,e.jsx)(A,{icon:(0,e.jsxs)(B,{children:[(0,e.jsx)(g,{size:64}),(0,e.jsx)(f,{width:64,height:64})]}),primaryText:r("whichExtensionToConnectWith"),headerStyle:"small"})})}),(0,e.jsx)(M,{plain:!0,children:(0,e.jsxs)(I,{children:[(0,e.jsx)(R,{children:(0,e.jsx)(c,{onClick:_,testID:"select_wallet--metamask",children:r("useMetaMask")})}),(0,e.jsx)(R,{children:(0,e.jsx)(c,{background:"spot",onClick:T,testID:"select_wallet--phantom",children:r("usePhantom")})}),(0,e.jsxs)(W,{children:[(0,e.jsx)(b,{children:(0,e.jsx)(h,{checked:n,onChange:()=>E(!n),label:{text:r("dontAskMeAgain"),color:"textBase"},shape:"square"})}),(0,e.jsx)(k,{color:a.colors.legacy.textDiminished,size:13,weight:500,lineHeight:16,textAlign:"left",children:r("configureInSettings")})]})]})})]})}),$=H;export{H as EthSelectWallet,$ as default};
//# sourceMappingURL=EthSelectWallet-MV5MM3MQ.js.map
