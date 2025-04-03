import { parseComasToSpace } from '../lib/utils'
import MODELS from '../models/index'
import { PopulateOpt, QueryParams, UnparsedQueryParams } from "./types";

const formatSearch = async (search: string, model: any) => {
  const targets: typeof model[] = await model
    .find({ name: { $regex: search, $options: "i" } })
    .select("_id"); 
  const targetsIds = targets.map(el => el._id);

  let updatedSearch: Record<string, any> = {}
  updatedSearch["$or"] = [
    { title: { $regex: search, $options: "i" } }, 
    { category: { $regex: search, $options: "i" } }, 
    { author: { $in: targetsIds } },
  ];

  return updatedSearch
}

const recursivePopulation = (populateObj: PopulateOpt): PopulateOpt => {
  const { populate, path, select: unparsedSelect } = populateObj
  const select = unparsedSelect ? parseComasToSpace(unparsedSelect) : ""

  if (!populate) return {path, select}

  return {
    path,
    select,
    populate: recursivePopulation(populate)
  };
};

const parseQueryParams = async (reqQuery: UnparsedQueryParams): Promise<QueryParams> => {
  const { select, populate, filters, model, sort, search, params } = reqQuery;
  
  return {
    sort,
    model: MODELS[model], 
    params: params ? JSON.parse(params) : {},
    filters: filters ? JSON.parse(filters) : {}, 
    search: search ? await formatSearch(search, MODELS[model]) : {},
    select: select ? parseComasToSpace(select) : undefined, 
    populate: populate ? recursivePopulation(JSON.parse(populate)) : undefined
  }
}

export const buildQuery = async (reqQuery: UnparsedQueryParams): Promise<any> => {
  try {
    const { model, select, sort, populate, filters, search, params } = await parseQueryParams(reqQuery);

    let query = model.find({...search, ...filters, ...params});
    if (select) query = query.select(select)
    if (sort) query = query.sort(sort)
    if (populate) query = query.populate(populate)
  
    return query;
  } catch (e) {
    console.error("error building query")
    console.error(e)
    return {}
  }
};