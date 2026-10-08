// Fail closed: automatic chat actions may only read. Sending stays in reviewed outreach.
export function readSlug(name:string){return /^[A-Z0-9_]+_(?:GET|LIST|FETCH|SEARCH|FIND|READ|RETRIEVE|LOOKUP|CHECK|BROWSE|CRAWL|SCRAPE|QUERY)_[A-Z0-9_]+$/.test(name)&&!/(TOKEN|SECRET|PASSWORD|CREDENTIAL|DELETE|UPDATE|CREATE|SEND|EXECUTE|RUN|AUTH)/.test(name);}
export function metaRead(name:string){return /(?:^|_)COMPOSIO_(SEARCH_TOOLS|GET_TOOL_SCHEMAS)$/i.test(name);}
