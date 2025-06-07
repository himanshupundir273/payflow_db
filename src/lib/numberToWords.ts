export function convertToIndianWords(num: number): string {
  if (isNaN(num)) return '';
  
  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const formatTens = (num: number): string => {
    if (num < 10) return single[num];
    if (num < 20) return double[num - 10];
    return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + single[num % 10] : '');
  };

  if (num === 0) return 'Zero';

  // Handle decimals
  const [intPart, decPart] = num.toFixed(2).split('.');
  let rupees = parseInt(intPart);
  const paise = parseInt(decPart);

  // Handle larger denominations
  const arab = Math.floor(rupees / 1000000000); // 1 Arab = 100 Crore
  rupees = rupees % 1000000000;
  const crore = Math.floor(rupees / 10000000);
  rupees = rupees % 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees = rupees % 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees = rupees % 1000;
  const hundred = Math.floor(rupees / 100);
  rupees = rupees % 100;

  let words = '';

  if (arab > 0) {
    words += (formatTens(arab) + ' Arab ');
  }
  if (crore > 0) {
    words += (formatTens(crore) + ' Crore ');
  }
  if (lakh > 0) {
    words += (formatTens(lakh) + ' Lakh ');
  }
  if (thousand > 0) {
    words += (formatTens(thousand) + ' Thousand ');
  }
  if (hundred > 0) {
    words += (formatTens(hundred) + ' Hundred ');
  }
  if (rupees > 0) {
    words += formatTens(rupees);
  }

  words = words.trim() + ' Rupees';

  if (paise > 0) {
    words += ' and ' + formatTens(paise) + ' Paise';
  }

  return words;
} 