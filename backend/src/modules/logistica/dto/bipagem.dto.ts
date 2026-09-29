import { IsString, IsNotEmpty } from "class-validator";

export class BipagemDto {
  @IsString()
  @IsNotEmpty()
  sku: string;
}
