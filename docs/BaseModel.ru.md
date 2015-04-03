# Rift.BaseModel

Наследует от [Rift.Cleanable](https://github.com/2gis/RiftJS/blob/master/docs/Cleanable.ru.md).  
Базовый класс для классов модели представления.  
При генерации страницы на сервере все данные хранимые в активных свойствах класса модели сериализуются в дамп из которого востанавливаются на клиенте. Далее на клиентской стороне приложение работает с уже готовыми данными, запрашивая по необходимости недостающие.