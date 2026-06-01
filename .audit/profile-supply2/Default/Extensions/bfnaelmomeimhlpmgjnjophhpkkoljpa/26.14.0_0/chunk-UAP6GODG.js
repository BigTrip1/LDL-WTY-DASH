import{a as Q,c as $,d as J}from"./chunk-VQF4OTRD.js";import{c as Y}from"./chunk-UME43M3J.js";import{b as q}from"./chunk-SKJQNFAY.js";import{g as x}from"./chunk-GBAAAYCS.js";import{a as _,d as K}from"./chunk-XOG6G6ZX.js";import{_a as a}from"./chunk-NZBVGICY.js";import{c as i}from"./chunk-UTR7UZ6P.js";import{$ as R,K as O,T as W,X as G,w as H,x as U}from"./chunk-WJBUW6MZ.js";import{F,Ta as N,U as I,sb as z}from"./chunk-TDGKP7HN.js";import{b as D}from"./chunk-BDAJYGKT.js";import{da as M}from"./chunk-YCHJLGQ6.js";import{Be as B,Ja as P,Ka as V,Kb as L,Ma as Ct,q as b,t as k}from"./chunk-ETNEVDD4.js";import{c as w,e as ht,f as E,qb as n,t as S}from"./chunk-77AVS43W.js";import{a as s,g as f,i as v,n as A}from"./chunk-TSHWMJEM.js";v();A();var p=f(ht(),1);var t=f(E(),1),Tt=s(r=>{let{t:e}=S(),{voteAccountPubkey:m}=r,{showStakeAccountCreateAndDelegateStatusModal:j,closeAllModals:tt}=q(),et=s(()=>{r.onClose(),tt()},"onCloseTxStatusView"),{data:ot}=M(b.Solana),{data:at}=N(),nt=at?.totalQuantityString??"";H(ot,z.STAKE_FUNGIBLE);let{cluster:it,connection:y}=I(),l=W(),rt=L(k.Solana),{data:st}=F({query:{data:rt}}),lt=st?.usd,o=(0,p.useMemo)(()=>l.results?.find(yt=>yt.voteAccountPubkey===m),[l.results,m]),mt=o?.info?.name??o?.info?.keybaseUsername??B(m),ct=Y(y),[c,C]=(0,p.useState)(""),d=w(c),g=P(1+(R(y).data??0)),h=G({balance:nt,cluster:it,rentExemptionMinimum:g}),dt=s(()=>C(h.toString()),"onSetMax"),ut=d.isLessThan(g),pt=d.isGreaterThan(h),gt=d.isFinite(),u=c&&ut?e("validatorViewAmountSOLRequiredToStakeInterpolated",{amount:g}):c&&pt?e("validatorViewInsufficientBalance"):"",ft=ct.isPending,T=gt&&!u&&!ft,St=s(()=>{j({lamports:V(d).toNumber(),votePubkey:m,usdPerSol:lt,onClose:et,validatorName:mt})},"onSubmit"),xt=o?.totalApy?O(o.totalApy):null;return(0,t.jsx)(vt,{children:l.isPending?(0,t.jsx)(_,{}):l.isError||!o?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(x,{children:e("validatorViewPrimaryText")}),(0,t.jsx)(X,{children:(0,t.jsxs)(a,{size:16,color:n.colors.legacy.textDiminished,lineHeight:20,children:[e("validatorViewErrorFetching")," ",l.error?.message??""]})})]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(x,{children:e("validatorViewPrimaryText")}),(0,t.jsxs)(X,{children:[(0,t.jsx)(a,{size:16,color:n.colors.legacy.textDiminished,lineHeight:20,margin:"0 0 20px 0",children:(0,t.jsxs)(D,{i18nKey:"validatorViewDescriptionInterpolated",children:["Choose how much SOL you\u2019d like to ",(0,t.jsx)("br",{}),"stake with this validator. ",(0,t.jsx)(Z,{href:U,children:"Learn more"})]})}),(0,t.jsx)(Q,{value:c,symbol:"SOL",alignSymbol:"right",buttonText:e("maxInputMax"),width:47,warning:!!u,onSetTarget:dt,onUserInput:C}),(0,t.jsx)(bt,{children:(0,t.jsx)(a,{color:u?n.colors.legacy.spotNegative:"transparent",size:16,textAlign:"left",children:u})}),(0,t.jsx)(wt,{onEdit:r.onClose}),(0,t.jsx)($,{identifier:o.voteAccountPubkey,name:o.info?.name,keybaseUsername:o.info?.keybaseUsername,iconUrl:o.info?.iconUrl,website:o.info?.website,data:[{label:e("validatorCardEstimatedApy"),value:(0,t.jsxs)(a,{textAlign:"right",weight:500,size:14,noWrap:!0,children:[xt,"%"]})},{label:e("validatorCardCommission"),value:(0,t.jsxs)(a,{textAlign:"right",weight:500,size:14,noWrap:!0,children:[o.commission,"%"]})},{label:e("validatorCardTotalStake"),value:(0,t.jsx)(a,{textAlign:"right",weight:500,size:14,noWrap:!0,children:(0,t.jsx)(J,{children:o.activatedStake})})}]})]}),(0,t.jsx)(At,{children:(0,t.jsx)(K,{primaryText:e("validatorViewActionButtonStake"),secondaryText:e("commandClose"),onPrimaryClicked:St,onSecondaryClicked:r.onClose,primaryTheme:T?"primary":"default",primaryDisabled:!T})})]})})},"StakeAmountPage"),ee=Tt,vt=i.div`
  display: grid;
  grid-template-rows: 42px auto 47px;
  height: 100%;
`,X=i.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`,Z=i.a.attrs({target:"_blank",rel:"noopener noreferrer"})`
  color: ${n.colors.legacy.spotBase};
  text-decoration: none;
  cursor: pointer;
`,At=i.section`
  display: flex;
  gap: 15px;
`,bt=i.div`
  width: 100%;
`,kt=i(a)`
  width: 100%;
  margin-top: 15px;
  > a {
    color: ${n.colors.legacy.spotBase};
    cursor: pointer;
  }
`,wt=s(r=>{let{t:e}=S();return(0,t.jsxs)(kt,{size:16,color:n.colors.legacy.textDiminished,lineHeight:20,textAlign:"left",children:[e("validatorViewValidator")," \u2022 ",(0,t.jsx)(Z,{onClick:r.onEdit,children:e("commandEdit")})]})},"ValidatorSectionLabel");export{Tt as a,ee as b};
//# sourceMappingURL=chunk-UAP6GODG.js.map
