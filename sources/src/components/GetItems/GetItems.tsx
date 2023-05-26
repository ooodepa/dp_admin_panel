import * as xlsx from 'xlsx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppModal from '../AppModal/AppModal';
import TableView from '../../components/TableView/TableView';
import FetchUsers from '../../utils/FetchBackend/rest/api/users';
import FetchItems from '../../utils/FetchBackend/rest/api/items';
import { AsyncAlertExceptionHelper } from '../../utils/AlertExceptionHelper';
import GetItemDto from '../../utils/FetchBackend/rest/api/items/dto/get-item.dto';
import BrowserDownloadFileController from '../../package/BrowserDownloadFileController';
import FetchItemCharacteristics from '../../utils/FetchBackend/rest/api/item-characteristics';

export default function GetItemsPage() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(<></>);
  const [sortType, setSortType] = useState('');
  const [isReverseSort, setIsReverseSort] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState(0);
  const [filterModel, setFilterModel] = useState('');
  const [filterName, setFilterName] = useState('');
  const [items, setItems] = useState([
    {
      dp_id: '',
      dp_name: '',
      dp_model: '',
      dp_cost: 0,
      dp_photoUrl: '',
      dp_seoKeywords: '',
      dp_seoDescription: '',
      dp_itemCategoryId: 0,
      dp_isHidden: '',
      dp_itemCharacteristics: [
        {
          dp_id: 0,
          dp_itemId: '',
          dp_characteristicId: 0,
          dp_value: '',
        },
      ],
      dp_itemGalery: [
        {
          dp_id: 0,
          dp_itemId: '',
          dp_photoUrl: '',
        },
      ],
    },
  ]);

  useEffect(() => {
    (async function () {
      try {
        await FetchUsers.isAdmin();

        const itemsJson = await FetchItems.get();
        setItems(itemsJson);
        localStorage.setItem('DP_CTL_Items', JSON.stringify(itemsJson));
      } catch (exception) {
        await AsyncAlertExceptionHelper(exception, navigate);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    const originalText = localStorage.getItem('DP_CTL_Items') || '[]';
    const original: GetItemDto[] = JSON.parse(originalText);
    let filteredItems = original;

    if (filterCategoryId !== 0) {
      filteredItems = filteredItems.filter(
        e => e.dp_itemCategoryId === filterCategoryId,
      );
    }

    if (filterModel.length !== 0) {
      filteredItems = filteredItems.filter(e =>
        checkMatch(filterModel, e.dp_model),
      );
    }

    if (filterName.length !== 0) {
      filteredItems = filteredItems.filter(e =>
        checkMatch(filterName, e.dp_name),
      );
    }

    setItems(filteredItems);
  }, [filterCategoryId, filterModel, filterName, items]);

  useEffect(() => {
    if (!isReverseSort && sortType === 'name') {
      setItems([...items].sort((a, b) => a.dp_name.localeCompare(b.dp_name)));
      return;
    }

    if (isReverseSort && sortType === 'name') {
      setItems([...items].sort((a, b) => b.dp_name.localeCompare(a.dp_name)));
      return;
    }

    if (!isReverseSort && sortType === 'model') {
      setItems([...items].sort((a, b) => a.dp_model.localeCompare(b.dp_model)));
      return;
    }

    if (isReverseSort && sortType === 'model') {
      setItems([...items].sort((a, b) => b.dp_model.localeCompare(a.dp_model)));
      return;
    }

    if (!isReverseSort && sortType === 'categoryId') {
      setItems(
        [...items].sort((a, b) => a.dp_itemCategoryId - b.dp_itemCategoryId),
      );
      return;
    }

    if (isReverseSort && sortType === 'categoryId') {
      setItems(
        [...items].sort((a, b) => b.dp_itemCategoryId - a.dp_itemCategoryId),
      );
      return;
    }

    if (!isReverseSort && sortType === 'cost') {
      setItems([...items].sort((a, b) => a.dp_cost - b.dp_cost));
      return;
    }

    if (isReverseSort && sortType === 'cost') {
      setItems([...items].sort((a, b) => b.dp_cost - a.dp_cost));
      return;
    }
  }, [isReverseSort, items, sortType]);

  function checkMatch(search: string, text: string): boolean {
    const regex = new RegExp(`.*${search}.*`);
    return regex.test(text);
  }

  function saveAsJson() {
    const filename = 'DP_CTL_Items.json';
    const text = JSON.stringify(items, null, 2);
    BrowserDownloadFileController.downloadFile(filename, text);
  }

  function removeFilters() {
    setFilterCategoryId(0);
    setFilterModel('');
    setFilterName('');
  }

  async function saveItemsAsXlsx() {
    try {
      const characteristics = await FetchItemCharacteristics.get();

      const headers = [
        'id',
        'Наименование',
        'Модель',
        'Цена',
        'Картинка',
        'Ключевые слова',
        'Описание',
        'Код категории',
        'Скрыт',
        'Галерея',
        ...characteristics.map(e => e.dp_name),
      ];

      const setCategoriesId: Set<number> = new Set();
      items.forEach(e => {
        setCategoriesId.add(e.dp_itemCategoryId);
      });

      const arrayCategoriesId = Array.from(setCategoriesId).sort(
        (a, b) => a - b,
      );

      const workbook = xlsx.utils.book_new();
      for (let i = 0; i < arrayCategoriesId.length; ++i) {
        const categoryId = arrayCategoriesId[i];

        const arr = items
          .filter(item => item.dp_itemCategoryId === categoryId)
          .sort((a, b) => a.dp_model.localeCompare(b.dp_model));

        const data: string[][] = [];

        for (let j = 0; j < arr.length; ++j) {
          const item = arr[j];
          data.push([
            item.dp_id,
            item.dp_name,
            item.dp_model,
            `${item.dp_cost}`,
            item.dp_photoUrl,
            item.dp_seoKeywords,
            item.dp_seoDescription,
            `${item.dp_itemCategoryId}`,
            item.dp_isHidden ? '1' : '0',
            item.dp_itemGalery.map(e => e.dp_photoUrl).join(' '),
            ...characteristics.map(
              e =>
                item.dp_itemCharacteristics.find(
                  j => e.dp_id === j.dp_characteristicId,
                )?.dp_value || '',
            ),
          ]);
        }

        const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
        xlsx.utils.book_append_sheet(workbook, worksheet, `${categoryId}`);
      }

      const excelBuffer = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const filename = 'DP_CTL_Items.xlsx';
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      BrowserDownloadFileController.downloadFileByBlob(filename, blob);
    } catch (exception) {
      await AsyncAlertExceptionHelper(exception, navigate);
    }
  }

  function preToDelete(id: string) {
    setModal(
      <AppModal
        title="Удаление элемента"
        message={`Вы уверены, что хотите удалить эелемент под id = ${id}?`}>
        <button onClick={() => toDelete(id)}>Удалить</button>
        <button onClick={() => setModal(<></>)}>Не удалять</button>
      </AppModal>,
    );
  }

  async function toDelete(id: string) {
    try {
      setModal(<></>);
      await FetchItems.remove(id);
      const itemsJson = await FetchItems.get();
      setItems(itemsJson);
      localStorage.setItem('DP_CTL_Items', JSON.stringify(itemsJson));
    } catch (exception) {
      await AsyncAlertExceptionHelper(exception, navigate);
    }
  }

  return (
    <TableView
      side={
        <div>
          <button onClick={() => navigate('new/create')}>
            Создать новый элемент
          </button>
          <button onClick={saveAsJson}>Скачать как JSON</button>
          <button onClick={saveItemsAsXlsx}>Скачать как XLSX</button>

          <p>Фильтр:</p>
          <button onClick={removeFilters}>убрать фильтры</button>
          <ul>
            <li>
              <label htmlFor="filterCategoryId">Код категории</label>
              <input
                id="filterCategoryId"
                type="number"
                value={filterCategoryId}
                onChange={event =>
                  setFilterCategoryId(Number(event.target.value))
                }
                min={0}
              />
            </li>
            <li>
              <label htmlFor="filterModel">Модель</label>
              <input
                id="filterModel"
                type="text"
                value={filterModel}
                onChange={event => setFilterModel(event.target.value)}
              />
            </li>
            <li>
              <label htmlFor="filterName">Наименование</label>
              <input
                id="filterName"
                type="text"
                value={filterName}
                onChange={event => setFilterName(event.target.value)}
              />
            </li>
            <li>
              <p>Сортировка:</p>
              <ul>
                <li>
                  <input
                    id="sortReverse"
                    type="checkbox"
                    checked={isReverseSort}
                    onChange={() => setIsReverseSort(!isReverseSort)}
                    />
                  <label htmlFor="sortReverse"></label>
                  <span>Обратная</span>
                </li>
                <li>
                  <input
                    id="sortModel"
                    type="radio"
                    name="sort"
                    onChange={() => setSortType('model')}
                  />
                  <label htmlFor="sortModel">Модель</label>
                </li>
                <li>
                  <input
                    id='sortName'
                    type="radio"
                    name="sort"
                    onChange={() => setSortType('name')}
                  />
                  <label htmlFor="sortName">Наименование</label>
                </li>
                <li>
                  <input
                    id="sortCodeCategory"
                    type="radio"
                    name="sort"
                    onChange={() => setSortType('categoryId')}
                  />
                  <label htmlFor="sortCodeCategory">Код категории</label>
                </li>
                <li>
                  <input
                    id="sortCost"
                    type="radio"
                    name="sort"
                    onChange={() => setSortType('cost')}
                  />
                  <label htmlFor="sortCost">Цена</label>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      }>
      <table>
        {modal}
        <thead>
          <tr>
            <td>Картинка</td>
            <td>Модель</td>
            <td>Наименование</td>
            <td>Код категории</td>
            <td>Цена</td>
            <td>Обновить</td>
            <td>Удалить</td>
          </tr>
        </thead>
        <tbody>
          {items.map(e => {
            return (
              <tr key={e.dp_id}>
                <td>
                  {!e.dp_photoUrl ? (
                    'нет'
                  ) : (
                    <img src={e.dp_photoUrl} alt="x" />
                  )}
                </td>
                <td>{e.dp_model}</td>
                <td>{e.dp_name}</td>
                <td>{e.dp_itemCategoryId}</td>
                <td>{Number(e.dp_cost).toFixed(2)}</td>
                <td>
                  <button onClick={() => navigate(e.dp_id)}>Обновить</button>
                </td>
                <td>
                  <button onClick={() => preToDelete(e.dp_id)}>Удалить</button>
                  </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableView>
  );
}
