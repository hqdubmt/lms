// IPA reference data and utilities

export const IPA_GUIDE = {
  vowels: [
    { symbol: '/iː/', example: 'see, feet', hint: 'i dài — như "i" trong "tivi"' },
    { symbol: '/ɪ/', example: 'sit, bit', hint: 'i ngắn — như "i" trong "ít"' },
    { symbol: '/e/', example: 'bed, said', hint: 'e ngắn — như "e" trong "em"' },
    { symbol: '/æ/', example: 'cat, hat', hint: 'a rộng — giữa "e" và "a"' },
    { symbol: '/ɑː/', example: 'car, father', hint: 'a dài — như "a" trong "ba"' },
    { symbol: '/ɒ/', example: 'hot, pot', hint: 'o ngắn, mở — như "o" trong "bò"' },
    { symbol: '/ɔː/', example: 'law, all', hint: 'o dài, tròn — như "ô" dài' },
    { symbol: '/ʊ/', example: 'book, put', hint: 'u ngắn, chùng — như "u" lỏng' },
    { symbol: '/uː/', example: 'food, too', hint: 'u dài — như "u" trong "bú"' },
    { symbol: '/ʌ/', example: 'cup, luck', hint: 'â ngắn — như "ă" ngắn' },
    { symbol: '/ɜː/', example: 'bird, her', hint: 'ơ dài — như "ơ" trong "bơ"' },
    { symbol: '/ə/', example: 'about, sofa', hint: 'schwa — âm trung tính nhất' },
  ],
  diphthongs: [
    { symbol: '/eɪ/', example: 'day, say', hint: 'ây — như "ây" trong "đây"' },
    { symbol: '/aɪ/', example: 'my, fly', hint: 'ai — như "ai" trong "mai"' },
    { symbol: '/ɔɪ/', example: 'boy, coin', hint: 'oi — như "oi" trong "boi"' },
    { symbol: '/aʊ/', example: 'now, out', hint: 'au — như "ao" trong "cao"' },
    { symbol: '/əʊ/', example: 'go, home', hint: 'ôu — như "ô" + "u"' },
    { symbol: '/ɪə/', example: 'here, ear', hint: 'ia — như "ia" trong "tia"' },
    { symbol: '/eə/', example: 'there, hair', hint: 'ea — giữa "e" và "a"' },
    { symbol: '/ʊə/', example: 'pure, tour', hint: 'ua — như "ua" trong "mua"' },
  ],
  consonants: [
    { symbol: '/p/', example: 'pen, spin', hint: 'môi-môi, vô thanh — như "p" câm' },
    { symbol: '/b/', example: 'bad, lab', hint: 'môi-môi, hữu thanh — như "b" Việt' },
    { symbol: '/t/', example: 'two, sting', hint: 'lưỡi-răng, vô thanh — như "t" câm' },
    { symbol: '/d/', example: 'do, odd', hint: 'lưỡi-răng, hữu thanh — như "đ" Việt' },
    { symbol: '/k/', example: 'cat, key', hint: 'gốc lưỡi, vô thanh — như "c/k" Việt' },
    { symbol: '/g/', example: 'get, big', hint: 'gốc lưỡi, hữu thanh — như "g" Việt' },
    { symbol: '/f/', example: 'fat, off', hint: 'môi-răng, vô thanh — như "ph" Việt' },
    { symbol: '/v/', example: 'van, have', hint: 'môi-răng, hữu thanh — như "v" Việt' },
    { symbol: '/θ/', example: 'think, bath', hint: 'lưỡi kẹp răng — KHÔNG có trong tiếng Việt' },
    { symbol: '/ð/', example: 'this, other', hint: 'lưỡi kẹp răng, rung — như "đ" nhẹ' },
    { symbol: '/s/', example: 'see, pass', hint: 'vô thanh — như "s" Việt' },
    { symbol: '/z/', example: 'zoo, has', hint: 'hữu thanh — như "z" rung' },
    { symbol: '/ʃ/', example: 'she, rush', hint: 'như "sh" — gần "x" Việt nhưng mạnh hơn' },
    { symbol: '/ʒ/', example: 'vision, measure', hint: 'hữu thanh của /ʃ/ — như "gi" mềm' },
    { symbol: '/h/', example: 'hat, ahead', hint: 'thanh hầu — như "h" Việt' },
    { symbol: '/tʃ/', example: 'church, match', hint: 'như "ch" Việt' },
    { symbol: '/dʒ/', example: 'judge, age', hint: 'hữu thanh — như "gi" mạnh' },
    { symbol: '/m/', example: 'man, some', hint: 'mũi môi — như "m" Việt' },
    { symbol: '/n/', example: 'no, ten', hint: 'mũi lưỡi — như "n" Việt' },
    { symbol: '/ŋ/', example: 'sing, long', hint: 'mũi gốc — như "ng" Việt' },
    { symbol: '/l/', example: 'let, bell', hint: 'bên lưỡi — như "l" Việt' },
    { symbol: '/r/', example: 'red, try', hint: 'cuộn lưỡi — KHÔNG có trong tiếng Việt' },
    { symbol: '/j/', example: 'yes, you', hint: 'bán nguyên âm — như "y" Việt' },
    { symbol: '/w/', example: 'wet, one', hint: 'bán nguyên âm tròn môi — như "u/oa" Việt' },
  ],
};

export function buildIpaGuideText(): string {
  const lines: string[] = [
    '# Bảng IPA Tiếng Anh — Hướng dẫn phát âm',
    '',
    '## Nguyên âm đơn (Monophthongs)',
  ];
  for (const v of IPA_GUIDE.vowels) {
    lines.push(`- **${v.symbol}** — ${v.example} — ${v.hint}`);
  }
  lines.push('', '## Nguyên âm đôi (Diphthongs)');
  for (const d of IPA_GUIDE.diphthongs) {
    lines.push(`- **${d.symbol}** — ${d.example} — ${d.hint}`);
  }
  lines.push('', '## Phụ âm (Consonants)');
  for (const c of IPA_GUIDE.consonants) {
    lines.push(`- **${c.symbol}** — ${c.example} — ${c.hint}`);
  }
  return lines.join('\n');
}
