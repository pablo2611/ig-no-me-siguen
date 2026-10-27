/* Procesamiento local de los JSON de conexiones de Instagram. */
(function(root){
  function parseList(data, kind) {
    const list = kind === 'following' && !Array.isArray(data) ? data?.relationships_following : data;
    if (!Array.isArray(list)) throw new Error('El archivo no contiene una lista válida de ' + (kind === 'followers' ? 'seguidores' : 'seguidos') + '.');
    const users = [];
    for (const item of list) {
      const entries = item && Array.isArray(item.string_list_data) ? item.string_list_data : [];
      const value = entries.find(x => x && typeof x.value === 'string')?.value || (kind === 'following' && typeof item?.title === 'string' ? item.title : '');
      const username = value.trim().replace(/^@/, '');
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) throw new Error('Hay un perfil sin un nombre de usuario válido. Comprueba que seleccionaste la exportación correcta.');
      users.push(username);
    }
    return users;
  }
  function compare(followers, following){
    const unique = (items) => { const seen = new Map(); for (const item of items) if (!seen.has(item.toLowerCase())) seen.set(item.toLowerCase(), item); return [...seen.values()]; };
    const a=unique(followers), b=unique(following), set=new Set(a.map(x=>x.toLowerCase()));
    const missing=b.filter(x=>!set.has(x.toLowerCase())).sort((x,y)=>x.localeCompare(y));
    return {followers:a.length,following:b.length,mutual:b.length-missing.length,missing};
  }
  root.LocalAnalysis={parseList,compare};
})(globalThis);