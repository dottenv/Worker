from aiogram.fsm.state import State, StatesGroup


class SettingsStates(StatesGroup):
    waiting_base_url = State()
    waiting_storage_chat = State()
