import { IsDate, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class PersonalLsDTO {
    @IsOptional()
    @IsString()
    lsid: string;

    @IsString()
    @IsNotEmpty()
    fio: string;

    @IsDate()
    @IsNotEmpty()
    doe: Date;

    @IsNumber()
    @IsOptional()
    pos_id: number | null;
}