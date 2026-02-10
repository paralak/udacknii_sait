import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class PersonalPosDTO {
    @IsOptional()
    @IsNumber()
    id: number;

    @IsNumber()
    @IsNotEmpty()
    hid: number;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    lsid: string | null;
}