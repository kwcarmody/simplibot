function flattenContentValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object') {
          return item.text || item.content || item.value || '';
        }

        return '';
      })
      .join('')
      .trim();
  }

  if (value && typeof value === 'object') {
    return String(value.text || value.content || value.value || '').trim();
  }

  return '';
}

function extractAssistantContent(data, adapterKey = 'default') {
  const standardContent = flattenContentValue(data?.message?.content)
    || flattenContentValue(data?.choices?.[0]?.message?.content);
  if (standardContent) {
    return standardContent;
  }

  if (adapterKey !== 'phi4-mini') {
    return '';
  }

  return flattenContentValue(data?.choices?.[0]?.text)
    || flattenContentValue(data?.response)
    || flattenContentValue(data?.content)
    || flattenContentValue(data?.output_text)
    || flattenContentValue(data?.output?.[0]?.content);
}

module.exports = {
  extractAssistantContent,
  flattenContentValue,
};
