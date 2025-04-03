import { Model } from "mongoose";

export type PopulateOpt = {
  populate?: PopulateOpt, 
  path: string, 
  select: string
}

export type QueryParams = {
  model: Model<any, {}, {}, {}, any, any>;
  select?: string; 
  sort?: string; 
  populate?: PopulateOpt;
  filters?: object; 
  search?: object;
  params?: object;
};

export type UnparsedQueryParams = {
  model: string;
  select?: string; 
  sort?: string; 
  populate?: string;
  filters?: string; 
  search?: string;
  params?: string
};