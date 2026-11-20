// Indian-format amount in words (lakh/crore) for cheques. No dependencies.
(function(){
  var ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  var tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function two(n){return n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');}
  function three(n){var h=Math.floor(n/100),r=n%100;return (h?ones[h]+' Hundred'+(r?' ':''):'')+(r?two(r):'');}
  function rupees(n){
    if(n===0)return 'Zero';
    var parts=[],cr=Math.floor(n/10000000);n%=10000000;
    if(cr)parts.push((cr>99?rupees(cr):two(cr))+' Crore');
    var l=Math.floor(n/100000);n%=100000;if(l)parts.push(two(l)+' Lakh');
    var t=Math.floor(n/1000);n%=1000;if(t)parts.push(two(t)+' Thousand');
    if(n)parts.push(three(n));
    return parts.join(' ');
  }
  function group(n){var s=String(n),last=s.slice(-3),rest=s.slice(0,-3);return rest?rest.replace(/\B(?=(\d{2})+(?!\d))/g,',')+','+last:last;}
  function convert(v){
    v=String(v).replace(/[,\s₹]/g,'');if(!/^\d+(\.\d{0,2})?$/.test(v))return null;
    var p=v.split('.'),r=parseInt(p[0],10),ps=p[1]?parseInt((p[1]+'0').slice(0,2),10):0;
    if(r>999999999999)return null;
    return {words:'Rupees '+rupees(r)+(ps?' and '+two(ps)+' Paise':'')+' Only',fig:group(r)+'.'+String(ps).padStart(2,'0')};
  }
  window.amountInWords=convert;
  var i=document.getElementById('amt'),o=document.getElementById('words'),f=document.getElementById('fig');
  if(!i)return;
  function upd(){var c=convert(i.value);o.textContent=c?c.words:(i.value?'Enter a valid amount (up to 2 decimal places).':'');f.textContent=c?'In figures: ₹'+c.fig+'/-':'';}
  i.addEventListener('input',upd);upd();
})();
