import ItemWithIdDto from './item-with-id.dto';

export default interface GetItemDto extends ItemWithIdDto {
  dp_isHidden: string;
}
